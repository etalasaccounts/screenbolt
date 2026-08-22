// apps/web's platform shim for the shared `packages/editor` UI (see
// docs/architecture.md's "Shared code: packages/editor" section and
// docs/specs/07-shared-editor.md).
//
// The shared EditorApp/ContentState were ported from apps/extension as-is,
// where `chrome.*` APIs are always real (editor.html runs inside the
// extension). Two call sites are true host-specific *adapters* (video
// source loading, save/export destination) and are handled by
// video-source-adapter.ts / save-destination-adapter.ts. Everything else
// that still touches `chrome.*` (i18n strings, small settings/telemetry
// reads via chrome.storage.local, best-effort chrome.runtime.sendMessage
// notifications, chrome.downloads for a couple of secondary/recovery
// download buttons in RightPanel) is *not* part of the editor's real
// UI/interaction logic -- it's the browser-extension-platform layer
// underneath it. This module provides a working (not stubbed) polyfill of
// that platform layer for a plain web page:
//
//   - chrome.i18n.getMessage: backed by the same English strings the
//     extension ships (apps/extension/src/_locales/en/messages.json),
//     copied into messages.en.json alongside this file -- so labels are
//     real copy, not "undefined".
//   - chrome.storage.local: backed by an in-memory + sessionStorage-backed
//     store (settings/telemetry persistence has no real value across page
//     loads on web the way it does for a long-lived extension, so
//     sessionStorage is enough and avoids leaking state across unrelated
//     recordings in the same browser).
//   - chrome.runtime.sendMessage / onMessage: there's no background
//     service worker on web to answer these. sendMessage resolves to a
//     small set of hand-picked defaults for the message types ContentState
//     actually branches on (see RESPONSES below); onMessage listeners are
//     retained so the same effect/cleanup code paths run, they just never
//     fire (nothing on web sends these messages either).
//   - chrome.downloads: RightPanel has a couple of secondary/recovery
//     "save this to disk" affordances (separate from the main Save/Export
//     flow, which goes through the saveDestination adapter instead) that
//     call chrome.downloads.download directly. Polyfilled with a plain
//     <a download> click, which is the direct web equivalent.
//   - chrome.tabs.getCurrent / chrome.runtime.getURL / getManifest: trivial
//     web-appropriate stand-ins.
//
// Only installed when running in this web app -- guarded per sub-API so it
// never overwrites a real `chrome.*` (e.g. this repo's Chromium browsers
// have `window.chrome` as a non-empty object even outside an extension).
import messagesEn from "./messages.en.json";

type MessageEntry = { message: string; description?: string };
const MESSAGES = messagesEn as Record<string, MessageEntry>;

const STORAGE_KEY = "__screenbolt_editor_chrome_storage_shim__";

function readStore(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, unknown>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // sessionStorage unavailable (private mode, SSR edge case) -- settings
    // just won't persist across a reload, which is a no-op for a single
    // recording session anyway.
  }
}

function normalizeGetKeys(
  keys: string | string[] | Record<string, unknown> | null | undefined,
  store: Record<string, unknown>,
): Record<string, unknown> {
  if (keys == null) return { ...store };
  if (typeof keys === "string") return { [keys]: store[keys] };
  if (Array.isArray(keys)) {
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = store[k];
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(keys)) out[k] = k in store ? store[k] : keys[k];
  return out;
}

// chrome.storage.local's real API is dual-mode: callback-style (MV2 habit,
// still used in a couple of call sites we ported as-is) and promise-style
// (MV3 default, used almost everywhere else). Support both.
function makeStorageArea() {
  return {
    get(
      keys?: string | string[] | Record<string, unknown> | null,
      callback?: (items: Record<string, unknown>) => void,
    ) {
      const result = normalizeGetKeys(keys, readStore());
      if (typeof callback === "function") {
        callback(result);
        return undefined;
      }
      return Promise.resolve(result);
    },
    set(items: Record<string, unknown>, callback?: () => void) {
      const store = readStore();
      Object.assign(store, items);
      writeStore(store);
      if (typeof callback === "function") {
        callback();
        return undefined;
      }
      return Promise.resolve();
    },
    remove(keys: string | string[], callback?: () => void) {
      const store = readStore();
      for (const k of Array.isArray(keys) ? keys : [keys]) delete store[k];
      writeStore(store);
      if (typeof callback === "function") {
        callback();
        return undefined;
      }
      return Promise.resolve();
    },
  };
}

// Message types ContentState/RightPanel branch on the *response* of --
// everything else is fire-and-forget telemetry/diagnostics that's safe to
// resolve to undefined.
function defaultSendMessageResponse(message: unknown): unknown {
  const type = (message as { type?: string } | null)?.type;
  switch (type) {
    case "check-review-prompt":
      return { showReview: false };
    case "check-banner-support":
      return { bannerSupport: false };
    case "save-to-drive":
    case "save-to-drive-fallback":
      // apps/web's own Drive integration (docs/architecture.md) is a
      // separate, dashboard-level feature, not reachable through this
      // chrome-messaging path -- see docs/specs/07-shared-editor.md status
      // notes. Report a generic failure so RightPanel's existing
      // failure-modal path handles it instead of hanging.
      return { status: "error", error: "not-available-on-web" };
    default:
      return undefined;
  }
}

function makeRuntime() {
  const listeners = new Set<
    (message: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => unknown
  >();
  return {
    lastError: undefined as { message: string } | undefined,
    getURL(path: string) {
      // Root-relative resolves against the current origin, matching how
      // chrome-extension://<id>/<path> resolves against the extension's
      // origin -- see the packages/editor call sites that were simplified
      // to plain "/assets/..." strings for the same reason.
      return "/" + String(path).replace(/^\/+/, "");
    },
    getManifest() {
      return { version: process.env.npm_package_version || "0.0.0" };
    },
    sendMessage(message: unknown, callback?: (response?: unknown) => void) {
      // "open-home" is PlayerNav's logo click and its Cancel button (real
      // extension UI, ported as-is) -- on the real extension this navigates
      // the whole tab away; here the editor only exists inside
      // EditingView's iframe, so forward it to the host page instead, which
      // listens for this same message shape (matching the existing
      // "screenbolt-editor-ready"/"screenbolt-editor-init" handshake this
      // module already does for the blob handoff) and discards back to the
      // library. Without this, those buttons were silently inert on web.
      const type = (message as { type?: string } | null)?.type;
      if (type === "open-home" && typeof window !== "undefined" && window.parent !== window) {
        window.parent.postMessage({ type: "screenbolt-editor-discard" }, window.location.origin);
      }
      const response = defaultSendMessageResponse(message);
      if (typeof callback === "function") {
        callback(response);
        return undefined;
      }
      return Promise.resolve(response);
    },
    onMessage: {
      addListener(fn: (message: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => unknown) {
        listeners.add(fn);
      },
      removeListener(fn: (message: unknown, sender: unknown, sendResponse: (r?: unknown) => void) => unknown) {
        listeners.delete(fn);
      },
    },
  };
}

function makeStorageNamespace() {
  return {
    local: makeStorageArea(),
    onChanged: {
      // Nothing else writes to this shim's storage from a separate
      // context on web (there's no background service worker), so these
      // never fire -- registering/unregistering them is still exercised
      // (same effect/cleanup code as the extension), just inert.
      addListener() {},
      removeListener() {},
    },
  };
}

function makeDownloads() {
  const listeners = new Set<(delta: unknown) => void>();
  return {
    download(
      options: { url: string; filename?: string; saveAs?: boolean },
      callback?: (downloadId?: number) => void,
    ) {
      try {
        const a = document.createElement("a");
        a.href = options.url;
        if (options.filename) a.download = options.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        callback?.(Date.now());
      } catch {
        callback?.(undefined);
      }
    },
    onChanged: {
      // A plain <a download> click has no observable interrupted/complete
      // lifecycle the way chrome.downloads does, so these listeners are
      // registered (matching the extension's code paths) but never fire.
      // Call sites that use them only do so for *optional* interrupt
      // recovery on top of an already-fired download() callback, not as
      // their only completion signal -- see
      // packages/editor/layout/player/RightPanel.js.
      addListener(fn: (delta: unknown) => void) {
        listeners.add(fn);
      },
      removeListener(fn: (delta: unknown) => void) {
        listeners.delete(fn);
      },
    },
  };
}

function makeI18n() {
  return {
    getMessage(key: string): string {
      if (key === "@@extension_id") return "";
      return MESSAGES[key]?.message ?? "";
    },
    getUILanguage() {
      return typeof navigator !== "undefined" ? navigator.language : "en";
    },
  };
}

type ChromeShim = {
  i18n: ReturnType<typeof makeI18n>;
  storage: ReturnType<typeof makeStorageNamespace>;
  runtime: ReturnType<typeof makeRuntime>;
  downloads: ReturnType<typeof makeDownloads>;
  tabs: { getCurrent(callback: (tab?: { id: number | null }) => void): void };
};

declare global {
  interface Window {
    chrome?: Partial<ChromeShim>;
  }
}

let installed = false;

/**
 * Installs the chrome.* polyfill described above, once per page, before the
 * shared <ContentState> mounts. Also seeds chrome.storage.local with
 * `lastRecordingBackendRef: { backend: "opfs" }`, which is what makes
 * ContentState's existing (unmodified) mount-time self-trigger effect --
 * written for the extension's OPFS recording backend -- call
 * `makeVideoTab()` immediately on web too, without needing a
 * chrome.runtime message from a background worker that doesn't exist here.
 * Real recording bytes are supplied through the videoSource adapter's
 * chooseReader (see video-source-adapter.ts), not through this backend ref
 * -- the ref only needs to say "opfs" to pick the right existing code path.
 */
export function installChromeShim() {
  if (typeof window === "undefined") return;
  if (!installed) {
    installed = true;
    const existing = (window.chrome ?? {}) as Partial<ChromeShim>;
    window.chrome = {
      i18n: existing.i18n ?? makeI18n(),
      storage: existing.storage ?? makeStorageNamespace(),
      runtime: existing.runtime ?? makeRuntime(),
      downloads: existing.downloads ?? makeDownloads(),
      tabs:
        existing.tabs ??
        ({
          getCurrent(callback: (tab?: { id: number | null }) => void) {
            callback({ id: null });
          },
        } as ChromeShim["tabs"]),
    };
  }
  // Re-seed on every mount (not just first install) since each recording
  // session should start from a clean "video is ready, backend is opfs"
  // state rather than whatever a previous session left in sessionStorage.
  //
  // fileName MUST end in ".webm": ContentState.reconstructVideo() only
  // takes its "isFastWebm" fast path (trust the blob as-is, read duration
  // straight off the <video> element, skip the OPFS-recovery-era
  // probe/fix-webm-duration/mediabunny-convert pipeline entirely) when
  // backend === "opfs" AND /\.webm$/i matches this fileName. The web
  // recording flow's blob is already a complete, already-duration-fixed
  // webm (use-screen-recorder.ts's stop() runs fixWebmBlobDuration before
  // handing it off) or an mp4 (which takes its own fast path keyed off
  // blob.type instead) -- there's nothing left for the slow path to fix. A
  // fileName without a ".webm" extension here (previously plain
  // "web-recording") made every webm web recording fail that regex and
  // fall into the slow path unconditionally, which re-probes duration from
  // the blob and immediately calls mediabunny's webm->mp4 conversion just
  // to load the editor -- most of what made recordings show up as an
  // unplayable black frame with a dead transport.
  window.chrome!.storage!.local!.set({
    lastRecordingBackendRef: { backend: "opfs", fileName: "web-recording.webm" },
  });
}
