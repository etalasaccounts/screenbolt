import React, { useContext, useEffect, useState, useRef } from "react";
import styles from "../../styles/player/_RightPanel.module.scss";

import { buildDiagnosticZip } from "../../utils/buildDiagnosticZip";
import { diagForward } from "../../utils/diagForward";
import { showEditorToast } from "../../utils/editorToast";
// downloadResolvedRecording/stageBlobToOpfs are part of the videoSource
// adapter (see docs/specs/07-shared-editor.md) — read off contentState
// (set by ContentState.jsx from the host-supplied videoSource prop) instead
// of importing recorderStorage directly, since recorderStorage stays
// apps/extension-specific.

import { ReactSVG } from "react-svg";

// Root-relative resolves against the current document's origin either way
// (chrome-extension://<id>/... in the extension, the site origin on web),
// so this doesn't need a host-specific adapter -- see Title.jsx/ShareModal.jsx
// which already used this simpler form.
const URL = "/assets/";

// Device-pairing upload to apps/web (docs/specs/04-integration.md). Separate
// flag from SCREENBOLT_ENABLE_CLOUD_FEATURES -- see
// src/pages/Background/webApp/config.js for why -- following the same
// per-file env-check convention used elsewhere in this codebase (e.g.
// EditorApp/components/global/ProBanner.jsx) rather than importing across
// the Background/EditorApp bundle boundary.
const WEB_UPLOAD_ENABLED = process.env.SCREENBOLT_ENABLE_WEB_UPLOAD !== "false";

import CropUI from "../editor/CropUI";
import AudioUI from "../editor/AudioUI";

import { ContentStateContext } from "../../context/ContentState";

const RightPanel = () => {
 const [contentState, setContentState] = useContext(ContentStateContext);
 const contentStateRef = useRef(contentState);
 const consoleErrorRef = useRef([]);
 // `disabled` on a <div role="button"> is inert, so the click still fires
 // while a save is in flight. contentStateRef lags a render, so hold the
 // in-flight lock in its own ref and clear it when saveDrive goes false
 // (failWith, or the "saved-to-drive" message on success).
 const saveDriveInFlight = useRef(false);

 useEffect(() => {
  console.error = (error) => {
   consoleErrorRef.current.push(error);
  };
 }, []);

 useEffect(() => {
  contentStateRef.current = contentState;
 }, [contentState]);

 useEffect(() => {
  if (!contentState.saveDrive) saveDriveInFlight.current = false;
 }, [contentState.saveDrive]);

 const getNotAvailableLabel = () => {
  if (contentState.fallback && contentState.noffmpeg && contentState.editLimit === 0) {
   return chrome.i18n.getMessage("notAvailableLongRecording");
  }
  if (contentState.fallback && contentState.noffmpeg) {
   return chrome.i18n.getMessage("notAvailableRecoveryMode");
  }
  return chrome.i18n.getMessage("notAvailableLabel");
 };

 const getPreparingLabel = () => {
  const base = chrome.i18n.getMessage("preparingLabel");
  const pct = Math.round(contentState.processingProgress || 0);
  if (!contentState.mp4ready && pct > 0) {
   return `${base} (${pct}%)`;
  }
  return base;
 };

 // sendMessage rejects past ~64 MB, and base64 inflates ~1.33x, so a base64
 // Drive upload is unsafe above ~48 MB. The OPFS path has no such limit; this
 // only gates the fallback when OPFS staging is unavailable.
 const DRIVE_BASE64_MAX_BYTES = 48 * 1024 * 1024;

 const saveToDrive = async () => {
  if (saveDriveInFlight.current) return;
  saveDriveInFlight.current = true;
  setContentState((prevContentState) => ({
   ...prevContentState,
   saveDrive: true,
  }));

  // Modal rather than a toast: the editor is an extension page, and the
  // background's show-toast relay only reaches the content script of the
  // active tab, so a toast raised here is never seen by someone sitting in
  // the editor. A modal also carries the recovery action for each cause.
  const failWith = (errorCode) => {
   const code = errorCode || "drive-generic";
   diagForward("editor-drive-save-fail", { errorCode: code });
   const base =
    {
     "drive-quota": "driveQuota",
     "drive-too-large": "driveTooLarge",
     "drive-auth": "driveAuth",
    }[code] || "driveGeneric";

   const openModal = contentStateRef.current?.openModal;
   if (typeof openModal === "function") {
    // Quota is the one cause retrying can't clear, so it links out to
    // Drive storage instead. Too-large has no recovery from here.
    let buttonLabel = chrome.i18n.getMessage("offlineLabelTryAgain");
    let action = () => runSaveToDrive();
    if (code === "drive-quota") {
     buttonLabel = chrome.i18n.getMessage("manageStorageButtonLabel");
     action = () =>
      window.open("https://drive.google.com/settings/storage", "_blank");
    } else if (code === "drive-too-large") {
     buttonLabel = null;
     action = () => {};
    }
    openModal(
     chrome.i18n.getMessage(`${base}ModalTitle`),
     chrome.i18n.getMessage(`${base}ModalDescription`),
     buttonLabel,
     chrome.i18n.getMessage("closeModalLabel"),
     action,
     () => {},
    );
   }

   setContentState((prevContentState) => ({
    ...prevContentState,
    saveDrive: false,
    driveError: code,
   }));
  };

  const handleDriveResponse = (response) => {
   if (!response || response.status === "ew" || response.error) {
    console.error(
     "[Drive] drive_save_failed:",
     response?.error || "unknown error",
    );
    failWith(response?.errorCode);
   }
   // On success, saveDrive is reset by the "saved-to-drive" message.
  };
  const handleDriveError = (err) => {
   console.error("[Drive] drive_save_error:", err);
   failWith("drive-generic");
  };

  // Pick the source: the MP4 export when ready, else the duration-fixed webm.
  // With neither, the background rebuilds from IndexedDB chunks itself (no
  // base64 transfer), so route straight to the fallback.
  const useMp4 =
   !contentState.noffmpeg && contentState.mp4ready && contentState.blob;
  const source = useMp4 ? contentState.blob : contentState.webm;
  const isWebm = !useMp4;

  if (!(source instanceof Blob) || source.size === 0) {
   chrome.runtime
    .sendMessage({ type: "save-to-drive-fallback", title: contentState.title })
    .then(handleDriveResponse)
    .catch(handleDriveError);
   return;
  }

  diagForward("editor-drive-save-start", {
   bytes: source.size,
   isWebm,
   transport: "opfs",
  });

  // Preferred: stage into OPFS and send only the filename. Streams to disk,
  // so it's memory-safe at any size — this is the large-file fix.
  const opfsFileName = await contentStateRef.current.stageBlobToOpfs(source, isWebm ? "webm" : "mp4");
  if (opfsFileName) {
   chrome.runtime
    .sendMessage({
     type: "save-to-drive",
     opfsFileName,
     isWebm,
     title: contentState.title,
    })
    .then(handleDriveResponse)
    .catch(handleDriveError);
   return;
  }

  // OPFS unavailable: fall back to base64, but only when small enough to
  // survive the message-size cap. Above it, tell the user instead of failing
  // silently the way this used to.
  if (source.size > DRIVE_BASE64_MAX_BYTES) {
   // Not a Drive limit: OPFS staging failed and the base64 fallback can't
   // carry this much over sendMessage. Drive would accept the file, so
   // don't tell the user it's too large for Drive; retrying can restage it.
   failWith("drive-generic");
   return;
  }
  diagForward("editor-drive-save-start", {
   bytes: source.size,
   isWebm,
   transport: "base64",
  });
  const reader = new FileReader();
  reader.onload = () => {
   const base64 = String(reader.result).split(",")[1];
   chrome.runtime
    .sendMessage({
     type: "save-to-drive",
     base64,
     title: contentState.title,
     isWebm,
    })
    .then(handleDriveResponse)
    .catch(handleDriveError);
  };
  reader.onerror = () => failWith("drive-generic");
  reader.readAsDataURL(source);
 };

 // Safety net: every failure path inside saveToDrive calls failWith, but an
 // unexpected throw would leave saveDrive stuck true and, now that the button
 // is genuinely gated, permanently dead.
 const runSaveToDrive = () => {
  saveToDrive().catch((err) => {
   console.error("[Drive] drive_save_unhandled:", err);
   saveDriveInFlight.current = false;
   setContentState((prevContentState) => ({
    ...prevContentState,
    saveDrive: false,
   }));
  });
 };

 const signOutDrive = () => {
  chrome.runtime.sendMessage({ type: "sign-out-drive" });
  setContentState((prevContentState) => ({
   ...prevContentState,
   driveEnabled: false,
  }));
 };

 // Upload to apps/web via the device-pairing bearer token
 // (docs/specs/04-integration.md). Mirrors saveToDrive above; the only
 // difference in shape is the "not-paired" error, which offers a
 // "Connect to Screenbolt" action instead of a retry.
 const [uploadingWeb, setUploadingWeb] = useState(false);
 const uploadWebInFlight = useRef(false);
 const UPLOAD_WEB_BASE64_MAX_BYTES = 48 * 1024 * 1024; // same sendMessage-size ceiling as Drive's base64 fallback

 const uploadToWeb = async () => {
  if (uploadWebInFlight.current) return;
  uploadWebInFlight.current = true;
  setUploadingWeb(true);

  const failWith = (errorCode) => {
   const code = errorCode || "upload-generic";
   diagForward("editor-web-upload-fail", { errorCode: code });
   const base =
    {
     "not-paired": "uploadNotPaired",
     "upload-too-large": "uploadTooLarge",
     "upload-auth": "uploadAuth",
     "upload-network": "uploadNetwork",
     "upload-not-configured": "uploadNotConfigured",
    }[code] || "uploadGeneric";

   const openModal = contentStateRef.current?.openModal;
   if (typeof openModal === "function") {
    let buttonLabel = chrome.i18n.getMessage("offlineLabelTryAgain");
    let action = () => runUploadToWeb();
    if (code === "not-paired") {
     buttonLabel =
      chrome.i18n.getMessage("connectScreenboltOption") ||
      "Connect to Screenbolt";
     action = () => {
      chrome.runtime.sendMessage({ type: "start-pairing" });
     };
    } else if (code === "upload-too-large") {
     buttonLabel = null;
     action = () => {};
    }
    openModal(
     chrome.i18n.getMessage(`${base}ModalTitle`),
     chrome.i18n.getMessage(`${base}ModalDescription`),
     buttonLabel,
     chrome.i18n.getMessage("closeModalLabel"),
     action,
     () => {},
    );
   }

   setUploadingWeb(false);
   uploadWebInFlight.current = false;
  };

  const handleUploadResponse = (response) => {
   if (!response || response.status === "ew" || response.error) {
    console.error(
     "[Upload] web_upload_failed:",
     response?.error || "unknown error",
    );
    failWith(response?.errorCode);
    return;
   }
   setUploadingWeb(false);
   uploadWebInFlight.current = false;
   showEditorToast(
    contentStateRef.current,
    chrome.i18n.getMessage("uploadedToScreenboltToast") ||
     "Uploaded to Screenbolt",
   );
  };
  const handleUploadError = (err) => {
   console.error("[Upload] web_upload_error:", err);
   failWith("upload-generic");
  };

  const useMp4 =
   !contentState.noffmpeg && contentState.mp4ready && contentState.blob;
  const source = useMp4 ? contentState.blob : contentState.webm;
  const isWebm = !useMp4;

  if (!(source instanceof Blob) || source.size === 0) {
   chrome.runtime
    .sendMessage({
     type: "upload-to-web-fallback",
     title: contentState.title,
    })
    .then(handleUploadResponse)
    .catch(handleUploadError);
   return;
  }

  diagForward("editor-web-upload-start", {
   bytes: source.size,
   isWebm,
   transport: "opfs",
  });

  const opfsFileName = await contentStateRef.current.stageBlobToOpfs(source, isWebm ? "webm" : "mp4");
  if (opfsFileName) {
   chrome.runtime
    .sendMessage({
     type: "upload-to-web",
     opfsFileName,
     isWebm,
     title: contentState.title,
    })
    .then(handleUploadResponse)
    .catch(handleUploadError);
   return;
  }

  if (source.size > UPLOAD_WEB_BASE64_MAX_BYTES) {
   failWith("upload-generic");
   return;
  }
  diagForward("editor-web-upload-start", {
   bytes: source.size,
   isWebm,
   transport: "base64",
  });
  const reader = new FileReader();
  reader.onload = () => {
   const base64 = String(reader.result).split(",")[1];
   chrome.runtime
    .sendMessage({
     type: "upload-to-web",
     base64,
     title: contentState.title,
     isWebm,
    })
    .then(handleUploadResponse)
    .catch(handleUploadError);
  };
  reader.onerror = () => failWith("upload-generic");
  reader.readAsDataURL(source);
 };

 const runUploadToWeb = () => {
  uploadToWeb().catch((err) => {
   console.error("[Upload] web_upload_unhandled:", err);
   uploadWebInFlight.current = false;
   setUploadingWeb(false);
  });
 };

 const handleEdit = () => {
  if (
   contentState.duration > contentState.editLimit &&
   !contentState.override
  )
   return;
  if (!contentState.mp4ready) return;

  contentState.createBackup();

  setContentState((prevContentState) => ({
   ...prevContentState,
   mode: "edit",
   dragInteracted: false,
  }));
 };

 const handleCrop = () => {
  if (
   contentState.duration > contentState.editLimit &&
   !contentState.override
  )
   return;

  if (!contentState.mp4ready) return;

  contentState.createBackup();

  // If the frame isn't cached yet, request it and defer the mode switch
  // until "new-frame" arrives, otherwise the cropper mounts over a blank
  // stage and there's a black flash for the round-trip duration.
  if (!contentState.frame) {
   setContentState((prevContentState) => ({
    ...prevContentState,
    pendingCropEntry: true,
   }));
   if (!contentState.isFfmpegRunning) contentState.getFrame();
   return;
  }

  setContentState((prevContentState) => ({
   ...prevContentState,
   mode: "crop",
  }));
 };

 const handleAddAudio = async () => {
  if (
   contentState.duration > contentState.editLimit &&
   !contentState.override
  )
   return;
  if (!contentState.mp4ready) return;

  contentState.createBackup();

  setContentState((prevContentState) => ({
   ...prevContentState,
   mode: "audio",
  }));
 };

 // Best available blob: edited MP4 → fixed WebM → raw WebM.
 const handleDownloadOriginal = () => {
  const s = contentStateRef.current;
  const source = s.blob || s.webm || s.rawBlob;
  if (!source) return;
  const blob =
   source instanceof Blob
    ? source
    : new Blob([source], { type: "video/webm" });
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const rawTitle = s.title || "recording";
  const safe = rawTitle
   .replace(/[\\:*?"<>|]/g, " ")
   .replace(/[\u0000-\u001F\u007F]/g, " ")
   .replace(/\s+/g, " ")
   .trim() || "recording";
  const url = window.URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: `${safe}.${ext}` }, () => {
   window.URL.revokeObjectURL(url);
  });
 };

 const handleRawRecording = () => {
  if (typeof contentStateRef.current.openModal === "function") {
   contentStateRef.current.openModal(
    chrome.i18n.getMessage("rawRecordingModalTitle"),
    chrome.i18n.getMessage("rawRecordingModalDescription"),
    chrome.i18n.getMessage("rawRecordingModalButton"),
    chrome.i18n.getMessage("sandboxEditorCancelButton"),
    async () => {
     const s = contentStateRef.current;
     const blob = s.rawBlob || s.blob;
     if (!blob) {
      // In-memory blob never loaded (e.g. an orphaned OPFS pointer left
      // the editor unable to load). Recover straight from the OPFS file.
      await contentStateRef.current.downloadResolvedRecording(s.title, (status) => {
       if (status === "started") return;
       showEditorToast(
        contentStateRef.current,
        chrome.i18n.getMessage("rawRecordingModalTitle") +
         (status === "active" ? "" : ": no data"),
       );
      });
      return;
     }

     const ext = blob.type.includes("mp4") ? "mp4" : "webm";
     const filename = `raw-recording.${ext}`;

     // base64-via-BG fallback: works in Brave and when blob-URL downloads
     // are restricted, doesn't depend on chrome.downloads from here.
     const fallbackViaBackground = async () => {
      const base64 = await new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onloadend = () => resolve(reader.result);
       reader.onerror = () => reject(reader.error);
       reader.readAsDataURL(blob);
      });
      chrome.runtime.sendMessage({
       type: "request-download",
       base64,
       title: filename,
      });
     };

     try {
      const url = window.URL.createObjectURL(blob);
      const downloadId = await new Promise((resolve, reject) => {
       try {
        chrome.downloads.download({ url, filename }, (id) => {
         if (chrome.runtime.lastError || !id) {
          reject(
           chrome.runtime.lastError ||
            new Error("download returned no id"),
          );
         } else {
          resolve(id);
         }
        });
       } catch (err) {
        reject(err);
       }
      });
      // Detect interrupted (non-user-cancel) downloads; matches the
      // main download flow in ContentState.jsx.
      const interruptHandler = async (delta) => {
       if (delta.id !== downloadId || !delta.state) return;
       if (
        delta.state.current === "interrupted" &&
        delta.error?.current !== "USER_CANCELED"
       ) {
        chrome.downloads.onChanged.removeListener(interruptHandler);
        try {
         await fallbackViaBackground();
        } catch (err) {
         console.error("[Screenbolt] raw download fallback failed:", err);
        }
       } else if (
        delta.state.current === "complete" ||
        delta.state.current === "interrupted"
       ) {
        chrome.downloads.onChanged.removeListener(interruptHandler);
        window.URL.revokeObjectURL(url);
       }
      };
      chrome.downloads.onChanged.addListener(interruptHandler);
     } catch (err) {
      console.warn(
       "[Screenbolt] raw download direct path failed, using fallback:",
       err,
      );
      try {
       await fallbackViaBackground();
      } catch (fallbackErr) {
       console.error(
        "[Screenbolt] raw download fallback failed:",
        fallbackErr,
       );
       showEditorToast(
        contentStateRef.current,
        chrome.i18n.getMessage("rawRecordingModalTitle") + ": failed",
       );
      }
     }
    },
    () => {}
   );
  }
 };

 const handleTroubleshooting = () => {
  if (typeof contentStateRef.current.openModal === "function") {
   contentStateRef.current.openModal(
    chrome.i18n.getMessage("troubleshootModalTitle"),
    chrome.i18n.getMessage("troubleshootModalDescription"),
    chrome.i18n.getMessage("troubleshootModalButton"),
    chrome.i18n.getMessage("sandboxEditorCancelButton"),
    async () => {
     try {
      const cs = contentStateRef.current;
      const { blob, filename } = await buildDiagnosticZip({
       source: "sandbox-editor",
       extraConfig: {
        editorMode: cs.mode || null,
        duration: cs.duration || null,
        width: cs.width || null,
        height: cs.height || null,
        hasBlobReady: Boolean(cs.blob || cs.rawBlob),
        mp4ready: Boolean(cs.mp4ready),
        ffmpegLoaded: Boolean(cs.ffmpegLoaded),
        fallback: Boolean(cs.fallback),
        offline: Boolean(cs.offline),
        noffmpeg: Boolean(cs.noffmpeg),
        updateChrome: Boolean(cs.updateChrome),
        hasBeenEdited: Boolean(cs.hasBeenEdited),
        editLimit: cs.editLimit || null,
       },
      });
      const url = window.URL.createObjectURL(blob);
      chrome.downloads.download(
       { url, filename },
       () => {
        window.URL.revokeObjectURL(url);
       },
      );
     } catch (err) {
      console.error("[Screenbolt] Troubleshooting export failed:", err);
     }
    },
    () => {},
   );
  }
 };

 return (
  <div className={styles.panel}>
   {contentState.mode === "audio" && <AudioUI />}
   {contentState.mode === "crop" && <CropUI />}
   {contentState.mode === "player" && (
    <div>
     {!contentState.fallback && contentState.offline && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/no-internet.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("offlineLabelTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {chrome.i18n.getMessage("offlineLabelDescription")}
        </div>
       </div>
       <div className={styles.buttonRight}>
        {chrome.i18n.getMessage("offlineLabelTryAgain")}
       </div>
      </div>
     )}
     {contentState.fallback && contentState.noffmpeg && contentState.editLimit === 0 && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/alert.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("longRecordingTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {chrome.i18n.getMessage("longRecordingDescription")}
        </div>
       </div>
       <div
        className={styles.buttonRight}
        onClick={handleDownloadOriginal}
       >
        {chrome.i18n.getMessage("rawRecordingModalButton")}
       </div>
      </div>
     )}
     {contentState.fallback && contentState.noffmpeg && contentState.editLimit !== 0 && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/alert.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("recoveryModeTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {chrome.i18n.getMessage("recoveryModeDescription")}
        </div>
       </div>
       <div
        className={styles.buttonRight}
        onClick={handleDownloadOriginal}
       >
        {chrome.i18n.getMessage("rawRecordingModalButton")}
       </div>
      </div>
     )}
     {!contentState.fallback &&
      contentState.updateChrome &&
      !contentState.offline &&
      contentState.duration <= contentState.editLimit && (
       <div className={styles.alert}>
        <div className={styles.buttonLeft}>
         <ReactSVG src={URL + "editor/icons/alert.svg"} />
        </div>
        <div className={styles.buttonMiddle}>
         <div className={styles.buttonTitle}>
          {chrome.i18n.getMessage("updateChromeLabelTitle")}
         </div>
         <div className={styles.buttonDescription}>
          {chrome.i18n.getMessage("updateChromeLabelDescription")}
         </div>
        </div>
        <div
         className={styles.buttonRight}
         onClick={() => {
          chrome.runtime.sendMessage({ type: "chrome-update-info" });
         }}
        >
         {chrome.i18n.getMessage("learnMoreLabel")}
        </div>
       </div>
      )}
     {!contentState.fallback &&
      contentState.duration > contentState.editLimit &&
      !contentState.override &&
      !contentState.offline &&
      !contentState.updateChrome && (
       <div className={styles.alert}>
        <div className={styles.buttonLeft}>
         <ReactSVG src={URL + "editor/icons/alert.svg"} />
        </div>
        <div className={styles.buttonMiddle}>
         <div className={styles.buttonTitle}>
          {chrome.i18n.getMessage("overLimitLabelTitle")}
         </div>
         <div className={styles.buttonDescription}>
          {contentState.blob?.type === "video/mp4"
           ? chrome.i18n.getMessage(
             "overLimitLabelDescriptionFastPath"
            )
           : chrome.i18n.getMessage("overLimitLabelDescription")}
         </div>
        </div>
        <div
         className={styles.buttonRight}
         onClick={() => {
          if (typeof contentState.openModal === "function") {
           contentState.openModal(
            chrome.i18n.getMessage("overLimitModalTitle"),
            chrome.i18n.getMessage(
             contentState.blob?.type === "video/mp4"
              ? "overLimitModalDescriptionFastPath"
              : "overLimitModalDescription"
            ),
            chrome.i18n.getMessage("overLimitModalButton"),
            chrome.i18n.getMessage("sandboxEditorCancelButton"),
            () => {
             setContentState((prevContentState) => ({
              ...prevContentState,
              saved: true,
             }));
             chrome.runtime.sendMessage({
              type: "force-processing",
             });
            },
            () => {},
            null,
            chrome.i18n.getMessage("overLimitModalLearnMore"),
            () => {
             chrome.runtime.sendMessage({ type: "upgrade-info" });
            }
           );
          }
         }}
        >
         {chrome.i18n.getMessage("learnMoreLabel")}
        </div>
       </div>
      )}
     {(contentState.downloadingWEBM || contentState.downloading) && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/alert.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("downloadProcessingTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {contentState.processingProgress > 0
          ? `${chrome.i18n.getMessage(
            "downloadProcessingDescription",
           )} (${contentState.processingProgress}%)`
          : chrome.i18n.getMessage("downloadProcessingDescription")}
        </div>
       </div>
       <div
        className={styles.buttonRight}
        onClick={() => contentState.cancelDownload?.()}
       >
        {chrome.i18n.getMessage("cancelLabel")}
       </div>
      </div>
     )}
     {(!contentState.mp4ready || contentState.isFfmpegRunning) &&
      !contentState.downloadingWEBM &&
      !contentState.downloading &&
      (contentState.duration <= contentState.editLimit ||
       contentState.override) &&
      !contentState.offline &&
      !contentState.updateChrome &&
      !contentState.noffmpeg && (
       <div className={styles.alert}>
        <div className={styles.buttonLeft}>
         <ReactSVG src={URL + "editor/icons/alert.svg"} />
        </div>
        <div className={styles.buttonMiddle}>
         <div className={styles.buttonTitle}>
          {chrome.i18n.getMessage("videoProcessingLabelTitle")}
         </div>
         <div className={styles.buttonDescription}>
          {contentState.isFfmpegRunning
           ? chrome.i18n.getMessage("editProcessingSafeDescription")
           : chrome.i18n.getMessage("videoProcessingLabelDescription")}
         </div>
        </div>
        {!contentState.isFfmpegRunning && (
        <div
         className={styles.buttonRight}
         onClick={() => {
          chrome.runtime.sendMessage({
           type: "pricing",
          });
         }}
        >
         {chrome.i18n.getMessage("learnMoreLabel")}
        </div>
        )}
       </div>
      )}

     {!contentState.fallback &&
      contentState.editErrorType === "too-long" &&
      !(
       contentState.duration > contentState.editLimit &&
       !contentState.override
      ) && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/alert.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("editTooLongTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {chrome.i18n.getMessage("editTooLongDescription")}
        </div>
       </div>
       <div
        className={styles.buttonRight}
        onClick={() =>
         setContentState((prev) => ({ ...prev, editErrorType: null }))
        }
       >
        {chrome.i18n.getMessage("permissionsModalDismiss")}
       </div>
      </div>
     )}
     {!contentState.fallback && contentState.editErrorType === "timeout" && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/alert.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("editTimeoutTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {chrome.i18n.getMessage("editTimeoutDescription")}
        </div>
       </div>
       <div
        className={styles.buttonRight}
        onClick={() =>
         setContentState((prev) => ({ ...prev, editErrorType: null }))
        }
       >
        {chrome.i18n.getMessage("permissionsModalDismiss")}
       </div>
      </div>
     )}
     {!contentState.fallback && contentState.editErrorType === "failed" && (
      <div className={styles.alert}>
       <div className={styles.buttonLeft}>
        <ReactSVG src={URL + "editor/icons/alert.svg"} />
       </div>
       <div className={styles.buttonMiddle}>
        <div className={styles.buttonTitle}>
         {chrome.i18n.getMessage("editFailedTitle")}
        </div>
        <div className={styles.buttonDescription}>
         {chrome.i18n.getMessage("editFailedDescription")}
        </div>
       </div>
       <div
        className={styles.buttonRight}
        onClick={() =>
         setContentState((prev) => ({ ...prev, editErrorType: null }))
        }
       >
        {chrome.i18n.getMessage("permissionsModalDismiss")}
       </div>
      </div>
     )}
     <div className={styles.section}>
      <div className={styles.sectionTitle}>
       {chrome.i18n.getMessage("sandboxEditTitle")}
      </div>
      <div className={styles.buttonWrap}>
       {(() => {
        // Same guard all three rows below share -- only surface a
        // status line when there's something to report (offline,
        // not available, still preparing); no static "what this
        // button does" copy once it's just ready to use.
        const editSectionDisabled =
         (contentState.duration > contentState.editLimit &&
          !contentState.override) ||
         !contentState.mp4ready ||
         contentState.noffmpeg;
        const editSectionStatus =
         contentState.offline && !contentState.ffmpegLoaded
          ? chrome.i18n.getMessage("noConnectionLabel")
          : contentState.updateChrome ||
           contentState.noffmpeg ||
           (contentState.duration > contentState.editLimit &&
            !contentState.override)
          ? getNotAvailableLabel()
          : contentState.mp4ready
          ? null
          : getPreparingLabel();
        return (
         <>
          <div
           role="button"
           className={styles.button}
           onClick={handleEdit}
           disabled={editSectionDisabled}
          >
           <div className={styles.buttonLeft}>
            <ReactSVG src={URL + "editor/icons/trim.svg"} />
           </div>
           <div className={styles.buttonMiddle}>
            <div className={styles.buttonTitle}>
             {chrome.i18n.getMessage("editButtonTitle")}
            </div>
            {editSectionStatus && (
             <div className={styles.buttonDescription}>
              {editSectionStatus}
             </div>
            )}
           </div>
           <div className={styles.buttonRight}>
            <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
           </div>
          </div>
          <div
           role="button"
           className={styles.button}
           onClick={handleCrop}
           disabled={editSectionDisabled}
          >
           <div className={styles.buttonLeft}>
            <ReactSVG src={URL + "editor/icons/crop.svg"} />
           </div>
           <div className={styles.buttonMiddle}>
            <div className={styles.buttonTitle}>
             {chrome.i18n.getMessage("cropButtonTitle")}
            </div>
            {editSectionStatus && (
             <div className={styles.buttonDescription}>
              {editSectionStatus}
             </div>
            )}
           </div>
           <div className={styles.buttonRight}>
            <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
           </div>
          </div>
          <div
           role="button"
           className={styles.button}
           onClick={handleAddAudio}
           disabled={editSectionDisabled}
          >
           <div className={styles.buttonLeft}>
            <ReactSVG src={URL + "editor/icons/audio.svg"} />
           </div>
           <div className={styles.buttonMiddle}>
            <div className={styles.buttonTitle}>
             {chrome.i18n.getMessage("addAudioButtonTitle")}
            </div>
            {editSectionStatus && (
             <div className={styles.buttonDescription}>
              {editSectionStatus}
             </div>
            )}
           </div>
           <div className={styles.buttonRight}>
            <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
           </div>
          </div>
         </>
        );
       })()}
      </div>
     </div>
     <div className={styles.section}>
      <div className={styles.sectionTitle}>
       {chrome.i18n.getMessage("sandboxExportTitle")}
      </div>
      <div className={styles.buttonWrap}>
       {contentState.fallback && (
        <div
         role="button"
         className={styles.button}
         onClick={() => contentState.downloadWEBM()}
         disabled={contentState.isFfmpegRunning}
        >
         <div className={styles.buttonLeft}>
          <ReactSVG src={URL + "editor/icons/download.svg"} />
         </div>
         <div className={styles.buttonMiddle}>
          <div className={styles.buttonTitle}>
           {contentState.downloadingWEBM
            ? chrome.i18n.getMessage("downloadingLabel")
            : chrome.i18n.getMessage("downloadWEBMButtonTitle")}
          </div>
         </div>
         <div className={styles.buttonRight}>
          <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
         </div>
        </div>
       )}
       {!contentState.fallback && (
        <div
         role="button"
         className={styles.button}
         onClick={() => contentState.downloadWEBM()}
         disabled={contentState.isFfmpegRunning}
        >
         <div className={styles.buttonLeft}>
          <ReactSVG src={URL + "editor/icons/download.svg"} />
         </div>
         <div className={styles.buttonMiddle}>
          <div className={styles.buttonTitle}>
           {contentState.downloadingWEBM
            ? chrome.i18n.getMessage("downloadingLabel")
            : chrome.i18n.getMessage("downloadWEBMButtonTitle")}
          </div>
          {contentState.isFfmpegRunning && (
           <div className={styles.buttonDescription}>
            {getPreparingLabel()}
           </div>
          )}
         </div>
         <div className={styles.buttonRight}>
          <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
         </div>
        </div>
       )}
       <div
        role="button"
        className={styles.button}
        onClick={() => {
         // disabled on a div is meaningless; gate click manually.
         // Not gated on isFfmpegRunning: it leaks from background
         // poll handlers and would intermittently swallow the
         // click. downloadGIF self-locks via downloadingGIF.
         if (
          contentState.downloadingGIF ||
          contentState.duration > 30 ||
          !contentState.mp4ready ||
          contentState.noffmpeg
         ) {
          return;
         }
         contentState.downloadGIF();
        }}
        disabled={
         contentState.downloadingGIF ||
         contentState.duration > 30 ||
         !contentState.mp4ready ||
         contentState.noffmpeg
        }
       >
        <div className={styles.buttonLeft}>
         <ReactSVG src={URL + "editor/icons/gif.svg"} />
        </div>
        <div className={styles.buttonMiddle}>
         <div className={styles.buttonTitle}>
          {contentState.downloadingGIF
           ? chrome.i18n.getMessage("downloadingLabel")
           : chrome.i18n.getMessage("downloadGIFButtonTitle")}
         </div>
         {(() => {
          const gifStatus =
           contentState.offline && !contentState.ffmpegLoaded
            ? chrome.i18n.getMessage("noConnectionLabel")
            : contentState.updateChrome ||
             contentState.noffmpeg ||
             (contentState.duration > contentState.editLimit &&
              !contentState.override)
            ? getNotAvailableLabel()
            : contentState.mp4ready
            ? null
            : getPreparingLabel();
          return (
           gifStatus && (
            <div className={styles.buttonDescription}>
             {gifStatus}
            </div>
           )
          );
         })()}
        </div>
        <div className={styles.buttonRight}>
         <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
        </div>
       </div>
      </div>
     </div>
     <div className={styles.section}>
      <div className={styles.sectionTitle}>
       {chrome.i18n.getMessage("sandboxAdvancedTitle")}
      </div>
      <div className={styles.buttonWrap}>
       <div
        role="button"
        className={styles.button}
        onClick={() => {
         handleRawRecording();
        }}
       >
        <div className={styles.buttonLeft}>
         <ReactSVG src={URL + "editor/icons/download.svg"} />
        </div>
        <div className={styles.buttonMiddle}>
         <div className={styles.buttonTitle}>
          {chrome.i18n.getMessage("rawRecordingButtonTitle")}
         </div>
        </div>
        <div className={styles.buttonRight}>
         <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
        </div>
       </div>
       <div
        role="button"
        className={styles.button}
        onClick={() => {
         handleTroubleshooting();
        }}
       >
        <div className={styles.buttonLeft}>
         <ReactSVG src={URL + "editor/icons/flag.svg"} />
        </div>
        <div className={styles.buttonMiddle}>
         <div className={styles.buttonTitle}>
          {chrome.i18n.getMessage("troubleshootButtonTitle")}
         </div>
        </div>
        <div className={styles.buttonRight}>
         <ReactSVG src={URL + "editor/icons/right-arrow.svg"} />
        </div>
       </div>
      </div>
     </div>
    </div>
   )}
  </div>
 );
};

export default RightPanel;
