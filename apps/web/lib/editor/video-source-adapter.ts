// apps/web's implementation of the shared editor's "video source loading"
// adapter point (docs/specs/07-shared-editor.md). apps/extension's
// implementation (apps/extension/src/pages/Editor/editorAdapters.js) reads
// chunk-by-chunk from recorderStorage (IndexedDB/OPFS), because the
// extension's background service worker writes the recording progressively
// while it's still happening. apps/web's recording flow already hands the
// editor a single, complete, in-memory Blob (see
// components/record/record-flow.tsx) once recording stops, so this adapter
// is much simpler: it just satisfies the same
// `{ open, readBlob, close }` ChunkReaderInterface contract
// (packages/editor/../Editor/recorderStorage/chunkReaderInterface.js on the
// extension side) with a reader that already has the answer.
import { stageBlobToOpfs } from "./opfs-stage";

export interface WebVideoSource {
  chooseReader: (backendRef?: unknown) => {
    open: (backendRef?: unknown) => Promise<void>;
    readBlob: (opts?: unknown) => Promise<{ blob: Blob; byteSize: number; chunkCount: number }>;
    close: () => Promise<void>;
  };
  downloadResolvedRecording: (
    titleBase: string | null | undefined,
    onResult?: (status: "started" | "no-data" | "active" | "failed") => void,
  ) => Promise<void>;
  stageBlobToOpfs: (blob: Blob, ext?: string) => Promise<string | null>;
}

/** `blob` is the just-finished web recording (see use-screen-recorder.ts). */
export function createWebVideoSource(blob: Blob): WebVideoSource {
  return {
    chooseReader() {
      return {
        async open() {},
        async readBlob() {
          return { blob, byteSize: blob.size, chunkCount: 1 };
        },
        async close() {},
      };
    },
    async downloadResolvedRecording(titleBase, onResult) {
      // No OPFS-recovery concept on web -- the recording blob is always
      // already in memory here (that's the whole point of this adapter),
      // so "resolve the recording" is a no-op; this button in RightPanel is
      // recovering from an extension-only failure mode (an orphaned OPFS
      // pointer after the background service worker restarts), which can't
      // happen when the video source was never chunked in the first place.
      if (!blob || blob.size === 0) {
        onResult?.("no-data");
        return;
      }
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${titleBase || "Screenbolt recording"}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onResult?.("started");
      } catch {
        onResult?.("failed");
      }
    },
    stageBlobToOpfs,
  };
}
