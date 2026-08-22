// apps/extension's implementations of the two host-specific adapter points
// that packages/editor's shared <EditorApp>/<ContentState> take as injected
// props, per docs/specs/07-shared-editor.md:
//
//  - videoSource: how the editor gets the recording's bytes. Extension
//   recordings are written chunk-by-chunk (by the background service
//   worker / offscreen recorder) into IndexedDB or OPFS, so the editor
//   reads them back via recorderStorage's ChunkReaderInterface.
//  - saveDestination: where the finished export goes. The extension keeps
//   its original chrome.downloads-based flow (with the Brave/base64
//   fallback and completion-wait/timeout), moved here unchanged from
//   ContentState.jsx's old inline `requestDownload` body.
//
// This file intentionally still imports chrome.* directly — it only ever
// runs inside the extension's editor.html page, where those APIs are real.
import { chooseReader } from "./recorderStorage/chooseReader";
import { downloadResolvedRecording } from "./recorderStorage/resolveRecordingFile";
import { stageBlobToOpfs } from "./recorderStorage/stageBlobToOpfs";

export const extensionVideoSource = {
 chooseReader,
 downloadResolvedRecording,
 stageBlobToOpfs,
};

// Moved verbatim from packages/editor/context/ContentState.jsx's old inline
// `requestDownload` body (see git history / docs/specs/07-shared-editor.md).
// Only the free variables that used to be ContentState closures are now
// parameters (`revoke`, `setContentState`, `contentStateRef`, `diagForward`,
// `showEditorToast`) — the control flow, retry logic, and Brave detection
// are byte-for-byte the same.
const deliver = async (
 url,
 filename,
 { revoke, setContentState, contentStateRef, diagForward, showEditorToast },
) => {
 // Brave: route via background for download
 if ((navigator.brave && (await navigator.brave.isBrave())) || false) {
  const resp = await fetch(url);
  const blob = await resp.blob();
  await new Promise((resolve) => {
   const reader = new FileReader();
   reader.onloadend = () => {
    chrome.runtime.sendMessage({
     type: "request-download",
     base64: reader.result,
     title: filename,
    });
    revoke();
    resolve();
   };
   reader.readAsDataURL(blob);
  });
  return;
 }

 const downloadId = await new Promise((resolve, reject) => {
  chrome.downloads.download({ url, filename, saveAs: true }, (id) => {
   const lastErr = chrome.runtime.lastError;
   // user cancelled Save-As; don't show "Download failed"
   const errMsg = String(lastErr?.message || "");
   if (errMsg.includes("USER_CANCELED") || errMsg.includes("canceled")) {
    revoke();
    resolve(null);
    return;
   }
   if (lastErr || !id) {
    reject(lastErr || new Error("Download failed"));
   } else {
    resolve(id);
   }
  });
 });
 if (downloadId == null) return;

 await new Promise((resolve) => {
  let settled = false;
  const timeoutMs = 10 * 60 * 1000;
  const timeoutId = setTimeout(() => {
   if (settled) return;
   settled = true;
   try {
    chrome.downloads.onChanged.removeListener(handler);
   } catch {}
   revoke();
   console.warn(
    "[Screenbolt] download status listener timed out, releasing handle",
    { downloadId, filename, timeoutMs },
   );
   // surface error so editor toasts fire; silent resolve would mask as success
   try {
    setContentState((prev) => ({
     ...prev,
     downloadError: "timeout",
     downloadInProgress: false,
    }));
   } catch {}
   diagForward("editor-download-fail", { reason: "timeout" });
   try {
    // Modal, not the relayed toast: show-toast only reaches the active
    // tab's content script, which is never the editor page.
    const openModal = contentStateRef.current?.openModal;
    if (typeof openModal === "function") {
     openModal(
      chrome.i18n.getMessage("downloadFailedModalTitle"),
      chrome.i18n.getMessage("downloadFailedModalDescription"),
      null,
      chrome.i18n.getMessage("closeModalLabel"),
      () => {},
      () => {},
     );
    }
   } catch {}
   resolve();
  }, timeoutMs);

  const handler = async (delta) => {
   if (delta.id !== downloadId || !delta.state) return;

   const done = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    chrome.downloads.onChanged.removeListener(handler);
    revoke();
    resolve();
   };

   if (
    delta.state.current === "interrupted" &&
    delta.error?.current !== "USER_CANCELED"
   ) {
    try {
     const resp = await fetch(url);
     const blob = await resp.blob();
     // sendMessage caps at ~64MB; base64 inflates 4/3, so cap at 30MB
     const BASE64_FALLBACK_MAX_BYTES = 30 * 1024 * 1024;
     if (blob.size > BASE64_FALLBACK_MAX_BYTES) {
      try {
       setContentState((prev) => ({
        ...prev,
        downloadError: "interrupted-too-large",
        downloadInProgress: false,
       }));
      } catch {}
      try {
       showEditorToast(
        contentStateRef.current,
        chrome.i18n.getMessage("downloadInterruptedLargeToast"),
        8000,
       );
      } catch {}
     } else {
      await new Promise((res) => {
       const reader = new FileReader();
       reader.onloadend = () => {
        chrome.runtime.sendMessage({
         type: "request-download",
         base64: reader.result,
         title: filename,
        });
        res();
       };
       reader.readAsDataURL(blob);
      });
     }
    } finally {
     done();
    }
   } else if (
    delta.state.current === "complete" ||
    delta.state.current === "interrupted"
   ) {
    done();
   }
  };

  chrome.downloads.onChanged.addListener(handler);
 });
};

export const extensionSaveDestination = { deliver };
