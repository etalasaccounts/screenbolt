import { captureThumbnail } from "@/lib/client/capture-thumbnail";
import { uploadVideo } from "@/lib/client/chunked-upload";

// apps/web's implementation of the shared editor's "save/export destination"
// adapter point (docs/specs/07-shared-editor.md). apps/extension's
// implementation (apps/extension/src/pages/Editor/editorAdapters.js) hands
// the export off to chrome.downloads (save-as-file, with a Brave/base64
// fallback). apps/web has no such concept -- the whole point of the web
// recorder is that the finished video lands in the user's Screenbolt
// library, not their downloads folder -- so this uploads to /api/upload
// instead, mirroring what apps/web's previous (now-removed) bare-bones
// editor did directly in record-flow.tsx's handleSave.
//
// ContentState.jsx's `requestDownload` calls `deliver(url, filename,
// helpers)` for every export path (Save/Export button, GIF export, WEBM
// export, etc.) with `url` a blob: URL for the finished video and
// `filename` already including its extension (e.g. "My Recording.mp4").
// Matching the extension's original behavior, this never throws -- failures
// are reported via the toast/error state helpers instead of an unhandled
// rejection, since ContentState's call sites don't all wrap
// `await requestDownload(...)` in their own try/catch.
export interface SaveDestinationHelpers {
  revoke: () => void;
  setContentState: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
  contentStateRef: { current: Record<string, unknown> };
  diagForward: (event: string, data: unknown) => void;
  showEditorToast: (contentState: unknown, message: string, durationMs?: number) => void;
}

export interface WebSaveDestination {
  deliver: (url: string, filename: string, helpers: SaveDestinationHelpers) => Promise<void>;
}

function titleFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export function createWebSaveDestination(opts: {
  onUploaded: (video: { id: string }) => void;
}): WebSaveDestination {
  return {
    async deliver(url, filename, helpers) {
      const { setContentState, contentStateRef, showEditorToast } = helpers;
      try {
        const [resp, thumbnailBlob] = await Promise.all([fetch(url), captureThumbnail(url)]);
        const blob = await resp.blob();

        const durationSec = Number(contentStateRef.current?.duration) || 0;

        // A long recording is a long upload, and the editor's only feedback
        // channel is this toast -- without a live percentage a multi-minute
        // save is indistinguishable from a hang, which is exactly when people
        // close the tab and lose the recording. Throttled to whole percents so
        // a 500-part upload does not re-render the toast on every chunk.
        let lastShownMessage = "";
        const { video } = await uploadVideo(new File([blob], filename, { type: blob.type }), {
          title: titleFromFilename(filename),
          durationSeconds: durationSec,
          thumbnail: thumbnailBlob,
          onProgress: ({ percent, phase }) => {
            const message =
              phase === "finishing" ? "Finishing up…" : `Uploading… ${percent}%`;
            if (message === lastShownMessage) return;
            lastShownMessage = message;
            try {
              showEditorToast(contentStateRef.current, message, 60_000);
            } catch {
              // Same rationale as the catch below: the toast slot is optional.
            }
          },
        });

        if (!video?.id) throw new Error("Upload failed");

        setContentState((prev) => ({ ...prev, saved: true }));
        opts.onUploaded(video as { id: string });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setContentState((prev) => ({ ...prev, downloadError: message }));
        try {
          showEditorToast(contentStateRef.current, message, 8000);
        } catch {
          // showEditorToast needs the editor's own toast slot mounted;
          // swallow if it isn't (matches the extension adapter's
          // best-effort try/catch around its own modal calls).
        }
      }
    },
  };
}
