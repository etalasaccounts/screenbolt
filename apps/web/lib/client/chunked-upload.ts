/**
 * Browser-side video uploader.
 *
 * Vercel rejects any request body over 4.5MB and offers no way to raise it,
 * so a whole recording can never be sent in one request. This slices the file
 * into parts that fit under that ceiling and uploads them one at a time, which
 * also buys the three things a single-shot upload could never offer: real
 * progress, per-part retry, and survival across a dropped connection (a failed
 * part is retried, not the whole video).
 *
 * Files small enough to fit in one request still take the single-shot
 * POST /api/upload path — it is one round trip instead of three, and it is a
 * frozen contract shared with the Chrome extension.
 */

import { apiFetch, apiFetchRaw, ApiClientError } from "./api-fetch";

/** Vercel's hard request-body cap is 4.5MB; 4MB leaves room for overhead. */
const PART_SIZE = 4 * 1024 * 1024;

/** Below this, one request is simpler and faster than init/part/complete. */
const SINGLE_SHOT_MAX = 4 * 1024 * 1024;

const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 30_000;

/** Parts in flight at once. Enough to use the connection, few enough to keep
 *  a flaky network from failing several parts at the same moment. */
const CONCURRENCY = 3;

/** How long to sit out an offline stretch before giving up on a part. */
const OFFLINE_WAIT_CAP_MS = 5 * 60 * 1000;

/**
 * Per-request ceilings. Without these a request that never answers — a dead
 * database socket on the server, a proxy that swallows the connection — leaves
 * the upload sitting at a fixed percentage forever with nothing logged and
 * nothing shown. A timeout turns that silence into a retry, and eventually
 * into an error the person can actually see.
 */
const REQUEST_TIMEOUT_MS = 60_000;
const PART_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Completion streams every part back out of storage, so how long it may
 * legitimately take scales with the video. A flat ceiling would either cut
 * off a large upload or make a small one hang for many minutes before saying
 * anything, so budget from the size: a minute of floor plus roughly half a
 * second per megabyte.
 */
function completeTimeoutMs(totalBytes: number): number {
  const budget = 60_000 + (totalBytes / (1024 * 1024)) * 500;
  return Math.min(budget, 15 * 60 * 1000);
}

/** A signal that fires on the caller's abort or after `ms`, whichever first. */
function withTimeout(ms: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0-100, rounded. */
  percent: number;
  /**
   * "finishing" covers the stretch after the last part is sent, while the
   * server assembles the video. It can take a while on a long recording, and
   * without a distinct label the UI just sits at 99% looking hung.
   */
  phase: "uploading" | "finishing";
}

export interface UploadedVideo {
  id: string;
  [key: string]: unknown;
}

export interface UploadVideoOptions {
  title?: string;
  durationSeconds?: number | null;
  thumbnail?: Blob | null;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

export interface UploadVideoResult {
  url: string;
  video: UploadedVideo;
}

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadAbortedError";
    Object.setPrototypeOf(this, UploadAbortedError.prototype);
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new UploadAbortedError();
}

/**
 * Whether another attempt could plausibly succeed. A rejected part (too large,
 * unauthorised, malformed) will be rejected identically forever, so retrying
 * it just delays the error the user needs to see.
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  // status 0 is api-fetch's marker for "the request never completed".
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new UploadAbortedError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Park until the browser reports a connection again. Without this, a tunnel or
 * a lift burns the whole retry budget in a few seconds of instant failures.
 */
function waitForOnline(signal?: AbortSignal): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine !== false) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(cap);
      window.removeEventListener("online", done);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = () => {
      clearTimeout(cap);
      window.removeEventListener("online", done);
      reject(new UploadAbortedError());
    };
    const cap = setTimeout(done, OFFLINE_WAIT_CAP_MS);
    window.addEventListener("online", done, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function withRetry<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    throwIfAborted(signal);
    try {
      return await operation();
    } catch (error) {
      if (error instanceof UploadAbortedError) throw error;
      // A timeout arrives as an abort too, so tell the two apart by asking the
      // caller's own signal: only a real cancellation must skip the retry.
      throwIfAborted(signal);
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS - 1) throw error;
      lastError = error;
      await waitForOnline(signal);
      const backoff = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
      await sleep(backoff + Math.random() * 300, signal);
    }
  }
  throw lastError;
}

async function uploadThumbnail(thumbnail: Blob, signal?: AbortSignal): Promise<string | null> {
  const form = new FormData();
  form.append("thumbnail", new File([thumbnail], "thumbnail.jpg", { type: "image/jpeg" }));
  try {
    const result = await withRetry(
      () =>
        apiFetch<{ url: string }>("/api/upload-thumbnail", {
          method: "POST",
          body: form,
          signal: withTimeout(REQUEST_TIMEOUT_MS, signal),
        }),
      signal,
    );
    return result.url;
  } catch (error) {
    if (error instanceof UploadAbortedError) throw error;
    // A missing thumbnail is a cosmetic loss; losing the recording over it
    // would not be. The library falls back to a placeholder.
    return null;
  }
}

async function uploadSingleShot(
  file: File,
  { title, durationSeconds, thumbnail, onProgress, signal }: UploadVideoOptions,
): Promise<UploadVideoResult> {
  const form = new FormData();
  form.append("video", file);
  if (title) form.append("title", title);
  if (durationSeconds != null) form.append("duration", String(Math.round(durationSeconds)));
  if (thumbnail) {
    form.append("thumbnail", new File([thumbnail], "thumbnail.jpg", { type: "image/jpeg" }));
  }

  onProgress?.({ loaded: 0, total: file.size, percent: 0, phase: "uploading" });

  const response = await withRetry(
    () =>
      apiFetchRaw<{ url: string; video: UploadedVideo }>("/api/upload", {
        method: "POST",
        body: form,
        signal: withTimeout(PART_TIMEOUT_MS, signal),
      }),
    signal,
  );

  onProgress?.({ loaded: file.size, total: file.size, percent: 100, phase: "finishing" });
  return { url: response.url, video: response.video };
}

async function uploadChunked(
  file: File,
  { title, durationSeconds, thumbnail, onProgress, signal }: UploadVideoOptions,
): Promise<UploadVideoResult> {
  const total = file.size;
  onProgress?.({ loaded: 0, total, percent: 0, phase: "uploading" });

  const session = await withRetry(
    () =>
      apiFetch<{ uploadId: string; key: string; pathname: string }>("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || undefined }),
        signal: withTimeout(REQUEST_TIMEOUT_MS, signal),
      }),
    signal,
  );

  const query = new URLSearchParams({
    uploadId: session.uploadId,
    key: session.key,
    pathname: session.pathname,
  });

  try {
    const thumbnailUrl = thumbnail ? await uploadThumbnail(thumbnail, signal) : null;

    const partCount = Math.max(1, Math.ceil(total / PART_SIZE));
    const parts: Array<{ etag: string; partNumber: number } | undefined> = new Array(partCount);
    let loaded = 0;
    let nextPart = 0;

    // Workers pull from a shared counter rather than getting a fixed slice
    // each, so one slow part cannot leave the other workers idle.
    async function worker() {
      for (;;) {
        const index = nextPart++;
        if (index >= partCount) return;
        throwIfAborted(signal);

        const start = index * PART_SIZE;
        const blob = file.slice(start, Math.min(start + PART_SIZE, total));
        const partNumber = index + 1;

        const result = await withRetry(
          () =>
            apiFetch<{ part: { etag: string; partNumber: number } }>(
              `/api/upload/part?${query}&partNumber=${partNumber}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/octet-stream" },
                body: blob,
                signal: withTimeout(PART_TIMEOUT_MS, signal),
              },
            ),
          signal,
        );

        parts[index] = result.part;
        loaded += blob.size;
        onProgress?.({
          loaded,
          total,
          // Held just under 100 until the join finishes, so the bar does not
          // sit at "done" while the server is still assembling the video.
          percent: Math.min(99, Math.round((loaded / total) * 100)),
          phase: "uploading",
        });
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, partCount) }, worker));

    const uploaded = parts.filter((part): part is { etag: string; partNumber: number } => !!part);
    if (uploaded.length !== partCount) {
      throw new Error("Some parts of the video did not upload");
    }

    onProgress?.({ loaded: total, total, percent: 99, phase: "finishing" });

    const completed = await withRetry(
      () =>
        apiFetch<{ url: string; video: UploadedVideo }>("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadId: session.uploadId,
            key: session.key,
            pathname: session.pathname,
            parts: uploaded,
            title,
            duration: durationSeconds != null ? Math.round(durationSeconds) : null,
            thumbnailUrl,
          }),
          signal: withTimeout(completeTimeoutMs(total), signal),
        }),
      signal,
    );

    onProgress?.({ loaded: total, total, percent: 100, phase: "finishing" });
    return { url: completed.url, video: completed.video };
  } catch (error) {
    // Leave no orphaned parts behind when the upload will not be resumed.
    void fetch(`/api/upload/part?uploadId=${encodeURIComponent(session.uploadId)}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => {});
    throw error;
  }
}

/**
 * Upload a video and create its library record, picking the single-shot or
 * chunked path by size. Rejects with ApiClientError on failure, or
 * UploadAbortedError when the caller's signal fires.
 */
export function uploadVideo(file: File, options: UploadVideoOptions = {}): Promise<UploadVideoResult> {
  return file.size <= SINGLE_SHOT_MAX
    ? uploadSingleShot(file, options)
    : uploadChunked(file, options);
}
