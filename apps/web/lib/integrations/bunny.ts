import { randomUUID } from "crypto";

/**
 * Bunny CDN (Edge Storage) client. Bunny's Storage API is a plain PUT/GET/
 * DELETE REST API with no native multipart-upload primitive, so the
 * "multipart" functions below emulate one: each part is stored as its own
 * object under a temp prefix, and completion streams those objects back
 * through this process into a single PUT.
 *
 * Two properties matter and are easy to break:
 *
 * 1. Parts live in *Bunny*, not on local disk. An earlier version buffered
 *    them to os.tmpdir(), which cannot work on Vercel: every request runs on
 *    a different ephemeral machine, so parts written during PUT
 *    /api/upload/part are gone by the time POST /api/upload/complete runs.
 *
 * 2. Completion never holds the video in memory. It concatenates by piping
 *    one part at a time into a streamed PUT, so peak memory is one network
 *    buffer regardless of file size. Bunny accepts a chunked (no
 *    Content-Length) request body -- verified against the live storage zone.
 */

const TMP_PREFIX = "tmp/uploads";

function storageHost(): string {
  return normalizeHost(process.env.BUNNY_STORAGE_HOST) || "storage.bunnycdn.com";
}

/**
 * Bunny host env vars should hold bare hostnames (e.g. "storage.bunnycdn.com"),
 * but it's easy to paste a full URL or include the zone. Normalize so the
 * built URL stays correct either way.
 */
function normalizeHost(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .trim();
}

export function isStorageConfigured(): boolean {
  return !!(
    process.env.BUNNY_STORAGE_ZONE &&
    process.env.BUNNY_STORAGE_ACCESS_KEY &&
    process.env.BUNNY_PULL_ZONE_HOST
  );
}

function publicUrl(pathname: string): string {
  return `https://${normalizeHost(process.env.BUNNY_PULL_ZONE_HOST)}/${pathname}`;
}

function storageUrl(pathname: string): string {
  return `https://${storageHost()}/${process.env.BUNNY_STORAGE_ZONE}/${pathname}`;
}

function accessKey(): string {
  return process.env.BUNNY_STORAGE_ACCESS_KEY!;
}

async function putToBunny(pathname: string, body: BodyInit, contentType?: string) {
  const res = await fetch(storageUrl(pathname), {
    method: "PUT",
    headers: {
      AccessKey: accessKey(),
      "Content-Type": contentType || "application/octet-stream",
    },
    body,
    // Node's fetch requires this when the body is a stream.
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  if (!res.ok) {
    throw new Error(`Bunny upload failed (${res.status}): ${await res.text().catch(() => res.statusText)}`);
  }
}

async function getFromBunny(pathname: string): Promise<Response> {
  return fetch(storageUrl(pathname), { headers: { AccessKey: accessKey() } });
}

/**
 * Names and byte sizes of the objects directly under a prefix.
 *
 * Bunny answers HEAD with 401 — its Storage API simply does not serve that
 * verb — so object existence has to be established some other way. Listing
 * the directory is the cheapest: one request covers every part at once.
 */
async function listDirectory(prefix: string): Promise<Map<string, number>> {
  const res = await getFromBunny(`${prefix}/`);
  if (!res.ok) return new Map();
  const entries = (await res.json().catch(() => [])) as Array<{
    ObjectName: string;
    Length: number;
    IsDirectory: boolean;
  }>;
  return new Map(
    entries.filter((entry) => !entry.IsDirectory).map((entry) => [entry.ObjectName, entry.Length]),
  );
}

/**
 * Byte size of one stored object, or null when it cannot be determined.
 *
 * Same HEAD problem as above, so this asks for a single byte and reads the
 * total out of the Content-Range header rather than downloading anything.
 */
async function objectSize(pathname: string): Promise<number | null> {
  const res = await fetch(storageUrl(pathname), {
    headers: { AccessKey: accessKey(), Range: "bytes=0-0" },
  });
  // Read the body, never cancel it. Next.js wraps global fetch, and in that
  // wrapper `res.body.cancel()` never settles — the request hangs forever with
  // no error and no log line, which is exactly how this surfaced: an upload
  // frozen at "Finishing…". Reading is free here; the range is a single byte.
  await res.arrayBuffer().catch(() => undefined);
  if (!res.ok) return null;
  const match = /\/(\d+)\s*$/.exec(res.headers.get("content-range") ?? "");
  return match ? Number(match[1]) : null;
}

/** Bunny deletes a whole prefix when the path ends in a slash. */
async function deleteDirectory(prefix: string): Promise<void> {
  await fetch(storageUrl(`${prefix}/`), {
    method: "DELETE",
    headers: { AccessKey: accessKey() },
  })
    // Drain rather than abandon the body, for the reason in objectSize.
    .then((res) => res.arrayBuffer())
    .catch(() => {});
}

/**
 * Store a single payload to Bunny with a public, randomized pathname.
 */
export async function putObject(pathname: string, body: BodyInit, contentType?: string) {
  await putToBunny(pathname, body, contentType);
  return { url: publicUrl(pathname), pathname };
}

function uploadDir(uploadId: string) {
  return `${TMP_PREFIX}/${uploadId}`;
}

function partFilename(partNumber: number) {
  return `part-${String(partNumber).padStart(6, "0")}`;
}

function partPath(uploadId: string, partNumber: number) {
  return `${uploadDir(uploadId)}/${partFilename(partNumber)}`;
}

export async function createMultipartUpload(pathname: string, contentType?: string) {
  const uploadId = randomUUID();
  // The final PUT needs the content type the client declared at init, and
  // nothing else survives between requests, so park it alongside the parts.
  await putToBunny(
    `${uploadDir(uploadId)}/meta.json`,
    JSON.stringify({ contentType: contentType ?? null }),
    "application/json",
  );
  return { uploadId, key: pathname };
}

export async function uploadPart(
  body: ArrayBuffer,
  { uploadId, partNumber }: { uploadId: string; partNumber: number },
) {
  await putToBunny(partPath(uploadId, partNumber), Buffer.from(body));
  // No real per-part checksum from Bunny (it has no multipart API) — the
  // "etag" here just orders/identifies parts for the completion step.
  return { etag: partFilename(partNumber), partNumber };
}

/**
 * A stream over every part in order, opening each one only when the previous
 * is drained. This is what keeps completion's memory flat: at most one part's
 * network buffer is live, never the assembled video.
 */
function joinedPartsStream(
  uploadId: string,
  ordered: { partNumber: number }[],
): ReadableStream<Uint8Array> {
  let next = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async function openNextPart(): Promise<boolean> {
    if (next >= ordered.length) return false;
    const { partNumber } = ordered[next++];
    const res = await getFromBunny(partPath(uploadId, partNumber));
    if (!res.ok || !res.body) {
      throw new Error(`Bunny part ${partNumber} could not be read (${res.status})`);
    }
    reader = res.body.getReader();
    return true;
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Loops because a part can end exactly on a pull, and because a zero
      // -length part must not be mistaken for the end of the whole stream.
      for (;;) {
        if (!reader && !(await openNextPart())) {
          controller.close();
          return;
        }
        const { done, value } = await reader!.read();
        if (done) {
          reader = null;
          continue;
        }
        controller.enqueue(value);
        return;
      }
    },
    cancel() {
      // Deliberately not awaited: cancelling a fetch body can hang under
      // Next's patched fetch (see objectSize), and this is already the
      // failure path — blocking here would turn an error into a freeze.
      void reader?.cancel().catch(() => {});
    },
  });
}

export async function completeMultipartUpload(
  pathname: string,
  parts: { etag: string; partNumber: number }[],
  { uploadId }: { uploadId: string },
) {
  const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);

  // Confirm every part landed *before* opening the final PUT. Discovering a
  // missing part mid-stream would leave a truncated video at `pathname` that
  // still gets a database row — a silently broken recording, which is worse
  // than a failed upload the client can retry.
  const stored = await listDirectory(uploadDir(uploadId));
  const missing = ordered
    .filter((p) => !stored.has(partFilename(p.partNumber)))
    .map((p) => p.partNumber);
  if (missing.length > 0) {
    // Completion has to be safe to retry: the client re-sends it whenever the
    // response was lost or the database write failed, and by then a *previous*
    // successful assembly will have consumed the parts. Missing parts with the
    // finished video already in place means this call has nothing left to do.
    const assembled = await objectSize(pathname);
    if (assembled !== null && assembled > 0) {
      return { url: publicUrl(pathname) };
    }
    throw new Error(`Upload is incomplete — missing part(s) ${missing.join(", ")}`);
  }
  const expectedBytes = ordered.reduce(
    (sum, p) => sum + (stored.get(partFilename(p.partNumber)) ?? 0),
    0,
  );

  const meta = await getFromBunny(`${uploadDir(uploadId)}/meta.json`)
    .then((res) => (res.ok ? (res.json() as Promise<{ contentType: string | null }>) : null))
    .catch(() => null);

  await putToBunny(pathname, joinedPartsStream(uploadId, ordered), meta?.contentType ?? undefined);

  // A stream that dies mid-flight can still leave a short object behind, so
  // verify the assembled length rather than trusting the PUT's status alone.
  const storedBytes = await objectSize(pathname);
  if (storedBytes !== null && storedBytes !== expectedBytes) {
    throw new Error(
      `Assembled video is ${storedBytes} bytes but the parts total ${expectedBytes} — upload was truncated`,
    );
  }

  await deleteDirectory(uploadDir(uploadId));
  return { url: publicUrl(pathname) };
}

/** Drop the temp parts of an upload the client gave up on. */
export async function abortMultipartUpload(uploadId: string) {
  await deleteDirectory(uploadDir(uploadId));
}
