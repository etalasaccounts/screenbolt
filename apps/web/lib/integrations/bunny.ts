import { randomUUID } from "crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

/**
 * Bunny CDN (Edge Storage) client. Bunny's Storage API is a plain PUT/GET/
 * DELETE REST API with no native multipart-upload primitive, so the
 * "multipart" functions below emulate one by buffering parts to local temp
 * files and doing a single PUT to Bunny on completion. That's fine for this
 * single-instance deployment; a multi-instance/serverless deployment would
 * need shared storage for the temp parts (or a real chunked-to-Bunny scheme)
 * instead of the local filesystem.
 */

const TMP_ROOT = path.join(os.tmpdir(), "screenbolt-uploads");

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

async function putToBunny(pathname: string, body: BodyInit, contentType?: string) {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_STORAGE_ACCESS_KEY;
  const res = await fetch(`https://${storageHost()}/${zone}/${pathname}`, {
    method: "PUT",
    headers: {
      AccessKey: key!,
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

/**
 * Store a single payload to Bunny with a public, randomized pathname.
 */
export async function putObject(pathname: string, body: BodyInit, contentType?: string) {
  await putToBunny(pathname, body, contentType);
  return { url: publicUrl(pathname), pathname };
}

export async function createMultipartUpload(pathname: string, contentType?: string) {
  const uploadId = randomUUID();
  const dir = path.join(TMP_ROOT, uploadId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "meta.json"), JSON.stringify({ contentType: contentType ?? null }));
  return { uploadId, key: pathname };
}

function partFilename(partNumber: number) {
  return `part-${String(partNumber).padStart(6, "0")}`;
}

export async function uploadPart(
  body: ArrayBuffer,
  { uploadId, partNumber }: { uploadId: string; partNumber: number },
) {
  const dir = path.join(TMP_ROOT, uploadId);
  await writeFile(path.join(dir, partFilename(partNumber)), Buffer.from(body));
  // No real per-part checksum from Bunny (it has no multipart API) — the
  // "etag" here just orders/identifies parts for the completion step.
  return { etag: partFilename(partNumber), partNumber };
}

export async function completeMultipartUpload(
  pathname: string,
  parts: { etag: string; partNumber: number }[],
  { uploadId }: { uploadId: string },
) {
  const dir = path.join(TMP_ROOT, uploadId);
  const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const [buffers, meta] = await Promise.all([
    Promise.all(ordered.map((p) => readFile(path.join(dir, partFilename(p.partNumber))))),
    readFile(path.join(dir, "meta.json"), "utf-8")
      .then((raw) => JSON.parse(raw) as { contentType: string | null })
      .catch(() => ({ contentType: null })),
  ]);
  await putToBunny(pathname, Buffer.concat(buffers), meta.contentType ?? undefined);
  await rm(dir, { recursive: true, force: true }).catch(() => {});
  return { url: publicUrl(pathname) };
}

// Best-effort cleanup for abandoned multipart sessions (not wired to a cron
// yet — call this from a maintenance route/script if temp disk usage grows).
export async function cleanupStaleUploads(olderThanMs = 24 * 60 * 60 * 1000) {
  const entries = await readdir(TMP_ROOT, { withFileTypes: true }).catch(() => []);
  const now = Date.now();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(TMP_ROOT, entry.name);
    const stat = await import("fs/promises").then((fs) => fs.stat(dir)).catch(() => null);
    if (stat && now - stat.mtimeMs > olderThanMs) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
