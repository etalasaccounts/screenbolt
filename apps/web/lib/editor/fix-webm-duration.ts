// MediaRecorder WebM blobs don't carry a duration in their header, which
// breaks seeking in <video> until it's patched in. Adapted from
// apps/extension's fixWebmDurationOffThread.js, minus its worker/blob-URL
// fallback dance — that existed to route around MV3 extension_pages CSP
// (worker-src forbids blob:), which doesn't apply to a normal Next.js page.
// See docs/specs/06-web-recording.md.
import fixWebmDuration from "fix-webm-duration";

export function fixWebmBlobDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (blob.type && !blob.type.includes("webm")) return Promise.resolve(blob);
  return new Promise((resolve) => {
    try {
      fixWebmDuration(blob, durationMs, (fixed: Blob) => resolve(fixed), { logger: false });
    } catch {
      resolve(blob); // unfixed (plays from start; seek metadata may be off)
    }
  });
}
