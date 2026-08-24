/**
 * Covers the assembly step of the chunked upload, which is the one place a
 * bug produces a *silently* broken result: a truncated object that still gets
 * a database row and only reveals itself when someone tries to watch it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { completeMultipartUpload, abortMultipartUpload } from "./bunny";

interface RecordedCall {
  method: string;
  url: string;
  body?: Buffer;
  contentType?: string;
}

let calls: RecordedCall[] = [];
/** Stored objects, keyed by the path after the zone. */
let objects: Map<string, Buffer>;

async function readBody(body: unknown): Promise<Buffer | undefined> {
  if (!body) return undefined;
  if (body instanceof ReadableStream) {
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  if (typeof body === "string") return Buffer.from(body);
  if (Buffer.isBuffer(body)) return body;
  return undefined;
}

function pathOf(url: string): string {
  // https://host/zone/<path>
  return new URL(url).pathname.split("/").slice(2).join("/");
}

beforeEach(() => {
  process.env.BUNNY_STORAGE_ZONE = "test-zone";
  process.env.BUNNY_STORAGE_ACCESS_KEY = "test-key";
  process.env.BUNNY_STORAGE_HOST = "storage.example.com";
  process.env.BUNNY_PULL_ZONE_HOST = "cdn.example.com";
  calls = [];
  objects = new Map();

  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const key = pathOf(url);
    const body = await readBody(init.body);
    const contentType = (init.headers as Record<string, string> | undefined)?.["Content-Type"];
    calls.push({ method, url: key, body, contentType });

    if (method === "PUT") {
      objects.set(key, body ?? Buffer.alloc(0));
      return new Response(null, { status: 201 });
    }
    if (method === "DELETE") {
      for (const existing of [...objects.keys()]) {
        if (existing.startsWith(key.replace(/\/$/, ""))) objects.delete(existing);
      }
      return new Response(null, { status: 200 });
    }
    // Bunny's Storage API does not serve HEAD — it answers 401. Mirrored here
    // so nothing in this module can quietly start depending on it again.
    if (method === "HEAD") {
      return new Response(null, { status: 401 });
    }

    // A trailing slash means "list this directory".
    if (key.endsWith("/")) {
      const prefix = key;
      const entries = [...objects.entries()]
        .filter(([name]) => name.startsWith(prefix) && !name.slice(prefix.length).includes("/"))
        .map(([name, buf]) => ({
          ObjectName: name.slice(prefix.length),
          Length: buf.length,
          IsDirectory: false,
        }));
      return Response.json(entries, { status: 200 });
    }

    const stored = objects.get(key);
    if (!stored) return new Response(null, { status: 404 });

    const range = (init.headers as Record<string, string> | undefined)?.Range;
    if (range) {
      return new Response(new Uint8Array(stored.subarray(0, 1)), {
        status: 206,
        headers: { "content-range": `bytes 0-0/${stored.length}` },
      });
    }
    return new Response(new Uint8Array(stored), { status: 200 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const UPLOAD_ID = "upload-1";
const DIR = `tmp/uploads/${UPLOAD_ID}`;

function seedParts(parts: Record<number, Buffer>) {
  objects.set(`${DIR}/meta.json`, Buffer.from(JSON.stringify({ contentType: "video/mp4" })));
  for (const [partNumber, buf] of Object.entries(parts)) {
    objects.set(`${DIR}/part-${String(partNumber).padStart(6, "0")}`, buf);
  }
}

function partList(numbers: number[]) {
  return numbers.map((partNumber) => ({
    etag: `part-${String(partNumber).padStart(6, "0")}`,
    partNumber,
  }));
}

describe("completeMultipartUpload", () => {
  it("concatenates parts in order regardless of the order they are listed in", async () => {
    seedParts({ 1: Buffer.from("aaa"), 2: Buffer.from("bbb"), 3: Buffer.from("ccc") });

    const result = await completeMultipartUpload(
      "videos/final.mp4",
      partList([3, 1, 2]),
      { uploadId: UPLOAD_ID },
    );

    expect(objects.get("videos/final.mp4")?.toString()).toBe("aaabbbccc");
    expect(result.url).toBe("https://cdn.example.com/videos/final.mp4");
  });

  it("stores the assembled video under the content type declared at init", async () => {
    seedParts({ 1: Buffer.from("aaa") });

    await completeMultipartUpload("videos/final.mp4", partList([1]), { uploadId: UPLOAD_ID });

    // Playback itself is driven by the pull zone, which types objects from
    // their extension. This guards the stored object's own type, which is
    // what any consumer reading from the Storage API directly will see.
    const put = calls.find((c) => c.method === "PUT" && c.url === "videos/final.mp4");
    expect(put?.contentType).toBe("video/mp4");
  });

  it("never streams a partial video when a part is missing", async () => {
    seedParts({ 1: Buffer.from("aaa"), 3: Buffer.from("ccc") });

    await expect(
      completeMultipartUpload("videos/final.mp4", partList([1, 2, 3]), { uploadId: UPLOAD_ID }),
    ).rejects.toThrow(/missing part\(s\) 2/);

    // The critical assertion: nothing was written, so no truncated video can
    // be handed to createVideo().
    expect(objects.has("videos/final.mp4")).toBe(false);
  });

  it("is safe to retry after a successful assembly consumed the parts", async () => {
    // What the client does when /complete succeeded but its response was lost,
    // or when the database write after it failed.
    objects.set("videos/final.mp4", Buffer.from("aaabbb"));

    const result = await completeMultipartUpload(
      "videos/final.mp4",
      partList([1, 2]),
      { uploadId: UPLOAD_ID },
    );

    expect(result.url).toBe("https://cdn.example.com/videos/final.mp4");
    expect(objects.get("videos/final.mp4")?.toString()).toBe("aaabbb");
  });

  it("rejects an assembled video whose length does not match its parts", async () => {
    seedParts({ 1: Buffer.from("aaa"), 2: Buffer.from("bbb") });

    // Simulate storage committing fewer bytes than were streamed.
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const response = await (realFetch as typeof fetch)(url, init);
      if ((init.method ?? "GET") === "PUT" && pathOf(url) === "videos/final.mp4") {
        objects.set("videos/final.mp4", Buffer.from("aa"));
      }
      return response;
    });

    await expect(
      completeMultipartUpload("videos/final.mp4", partList([1, 2]), { uploadId: UPLOAD_ID }),
    ).rejects.toThrow(/truncated/);
  });

  it("clears the temp parts once the video is assembled", async () => {
    seedParts({ 1: Buffer.from("aaa"), 2: Buffer.from("bbb") });

    await completeMultipartUpload("videos/final.mp4", partList([1, 2]), { uploadId: UPLOAD_ID });

    expect([...objects.keys()].filter((k) => k.startsWith(DIR))).toEqual([]);
  });

  it("keeps the temp parts when assembly fails, so the client can retry", async () => {
    seedParts({ 1: Buffer.from("aaa") });

    await expect(
      completeMultipartUpload("videos/final.mp4", partList([1, 2]), { uploadId: UPLOAD_ID }),
    ).rejects.toThrow();

    expect(objects.has(`${DIR}/part-000001`)).toBe(true);
  });
});

describe("abortMultipartUpload", () => {
  it("removes every part of an abandoned upload", async () => {
    seedParts({ 1: Buffer.from("aaa"), 2: Buffer.from("bbb") });

    await abortMultipartUpload(UPLOAD_ID);

    expect([...objects.keys()].filter((k) => k.startsWith(DIR))).toEqual([]);
  });
});
