// Uploads a finished recording to apps/web using the device-pairing bearer
// token (see ../pairing/pairingClient.js and
// docs/specs/04-integration.md). Mirrors ../drive/handleSaveToDrive.js's
// shape (opfs-staged file preferred, base64 fallback, IndexedDB-chunks
// recovery fallback) so the editor's "Save" panel can offer this alongside
// Google Drive with the same request contract.
//
// Uses apps/web's single-shot `POST /api/upload` (multipart `video` file +
// `title`), matching apps/web/app/api/upload/route.ts. The chunked
// init/part/complete flow documented in docs/specs/04-integration.md is not
// wired here -- see docs/specs/04-integration.md's status notes.
import { base64ToUint8Array } from "../utils/base64ToUint8Array";
import { sendMessageTab } from "../tabManagement";
import { chunksStore } from "../recording/chunkHandler";
import { diagEvent } from "../../utils/diagnosticLog";
import { getDeviceToken, DEVICE_TOKEN_KEY } from "../pairing/pairingClient";
import { WEB_APP_URL } from "../webApp/config";

// Single-request ceiling on apps/web's side (MAX_SIZE in app/api/upload/route.ts).
const MAX_SINGLE_SHOT_BYTES = 500 * 1024 * 1024;

const sanitizeTitle = (raw) => {
  let out = String(raw ?? "");
  out = out.replace(/[\x00-\x1f\x7f]/g, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out || "Screenbolt Recording";
};

const classifyUploadError = (status, message) => {
  if (status === 401 || status === 403) return "upload-auth";
  if (status === 413) return "upload-too-large";
  if (status === 503) return "upload-not-configured";
  if (/network|failed to fetch/i.test(String(message || ""))) {
    return "upload-network";
  }
  return "upload-generic";
};

const uploadBlobToWeb = async (blob, fileName, title) => {
  const token = await getDeviceToken();
  if (!token) {
    return {
      status: "ew",
      url: null,
      error: "Not paired with Screenbolt yet",
      errorCode: "not-paired",
    };
  }

  if (blob.size > MAX_SINGLE_SHOT_BYTES) {
    return {
      status: "ew",
      url: null,
      error: "Recording too large for single-shot upload",
      errorCode: "upload-too-large",
    };
  }

  const formData = new FormData();
  formData.append("video", blob, fileName);
  formData.append("title", sanitizeTitle(title));

  diagEvent("web-upload-start", { blobSize: blob.size, blobType: blob.type });

  let res;
  try {
    res = await fetch(`${WEB_APP_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch (err) {
    const message = String(err?.message || err);
    diagEvent("web-upload-fail", { error: message.slice(0, 120), errorCode: "upload-network" });
    return { status: "ew", url: null, error: message, errorCode: "upload-network" };
  }

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body; keep the generic message
    }
    const errorCode = classifyUploadError(res.status, message);
    // 401/403 means the device token was revoked or expired server-side;
    // drop it locally so the next upload attempt prompts re-pairing instead
    // of retrying with a token that will never work again.
    if (errorCode === "upload-auth") {
      await chrome.storage.local.remove([DEVICE_TOKEN_KEY]);
    }
    diagEvent("web-upload-fail", { error: String(message).slice(0, 120), errorCode, status: res.status });
    return { status: "ew", url: null, error: message, errorCode };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    return {
      status: "ew",
      url: null,
      error: "Malformed upload response",
      errorCode: "upload-generic",
    };
  }

  diagEvent("web-upload-ok", { videoId: data?.video?.id || null });
  return { status: "ok", url: data?.url || null, video: data?.video || null };
};

const uploadedToWeb = async () => {
  const { sandboxTab } = await chrome.storage.local.get(["sandboxTab"]);
  if (!sandboxTab) {
    console.warn("[Upload] uploadedToWeb: sandboxTab not set, cannot notify UI");
    return;
  }
  try {
    await sendMessageTab(sandboxTab, { type: "uploaded-to-web" });
  } catch (err) {
    console.warn("[Upload] uploadedToWeb: failed to notify sandbox tab:", err);
  }
};

// The editor stages exports into OPFS before handing off the filename here
// (see stageBlobToOpfs.js, shared with the Drive path -- its "drive-upload-"
// prefix is just that helper's naming, not Drive-specific). Always clean up
// the staged file once we're done with it, success or failure.
const removeStagedOpfsFile = async (name) => {
  if (!name) return;
  try {
    const dir = await navigator.storage.getDirectory();
    await dir.removeEntry(name).catch(() => {});
  } catch {}
};

export const handleUploadToWeb = async (request, fallback = false) => {
  try {
    let response;

    if (!fallback && request.opfsFileName) {
      const ext = request.isWebm ? ".webm" : ".mp4";
      const fileName = (request.title || "Screenbolt Recording") + ext;
      let opfsFile;
      try {
        const dir = await navigator.storage.getDirectory();
        const handle = await dir.getFileHandle(request.opfsFileName);
        opfsFile = await handle.getFile();
      } catch (err) {
        await removeStagedOpfsFile(request.opfsFileName);
        diagEvent("web-upload-fail", {
          error: `opfs-read: ${String(err?.message || err).slice(0, 90)}`,
          errorCode: "upload-generic",
        });
        return {
          status: "ew",
          url: null,
          error: "Could not read the staged recording",
          errorCode: "upload-generic",
        };
      }
      try {
        response = await uploadBlobToWeb(opfsFile, fileName, request.title);
      } finally {
        await removeStagedOpfsFile(request.opfsFileName);
      }
    } else if (!fallback) {
      const blob = base64ToUint8Array(request.base64);
      const ext = request.isWebm ? ".webm" : ".mp4";
      const fileName = (request.title || "Screenbolt Recording") + ext;
      response = await uploadBlobToWeb(blob, fileName, request.title);
    } else {
      // viewer/recovery mode: rebuild blob from IndexedDB chunks, same as
      // handleSaveToDrive's fallback path.
      const chunks = [];
      await chunksStore.iterate((value) => chunks.push(value));

      if (chunks.length === 0) {
        console.error("[Upload] web_upload_failed: no chunks in IndexedDB");
        return { status: "ew", url: null, error: "No recording data found", errorCode: "upload-generic" };
      }

      chunks.sort((a, b) => {
        const ta = a.timestamp ?? a.index ?? 0;
        const tb = b.timestamp ?? b.index ?? 0;
        return ta - tb;
      });

      const parts = chunks.map((c) =>
        c.chunk instanceof Blob ? c.chunk : new Blob([c.chunk]),
      );
      const blob = new Blob(parts, { type: "video/webm" });
      const fileName = (request.title || "Screenbolt Recording") + ".webm";
      response = await uploadBlobToWeb(blob, fileName, request.title);
    }

    if (response.status === "ok") {
      await uploadedToWeb();
    }
    return response;
  } catch (err) {
    console.error("[Upload] handleUploadToWeb failed:", err);
    diagEvent("web-upload-fail", {
      error: String(err?.message || err).slice(0, 120),
      errorCode: "upload-generic",
    });
    return { status: "ew", url: null, error: err?.message || String(err), errorCode: "upload-generic" };
  }
};
