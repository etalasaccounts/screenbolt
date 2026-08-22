// Device-pairing token handoff between this extension and apps/web.
// See ../../../../../docs/specs/04-integration.md for the full design.
//
// apps/web authenticates its own pages via NextAuth session cookies, which
// the extension (a different origin, running in background/offscreen
// contexts) can never carry. Instead:
//   1. This module generates a random pairing code locally (a UUID) and
//      registers it with POST /api/extension/pair/init.
//   2. It opens a normal browser tab to apps/web's /connect?code=<code>,
//      where the already-logged-in user approves the device.
//   3. It polls GET /api/extension/pair/status?code=<code> until approved,
//      at which point the response carries a bearer token (once).
//   4. The token is stored in chrome.storage.local and later sent as
//      `Authorization: Bearer <token>` by ../upload/uploadToWeb.js.
import { diagEvent } from "../../utils/diagnosticLog";
import { addAlarmListener } from "../alarms/addAlarmListener";
import { PAIRING_POLL_ALARM } from "../alarms/alarmConstants";
import { WEB_APP_URL } from "../webApp/config";

const POLL_INTERVAL_MS = 2000;
// Server-side pairing TTL is 10 minutes (PAIRING_TTL_MS in apps/web/lib/devices.ts).
// Poll slightly past that so a late approval is still observed, and the final
// poll can pick up the server's own "expired" status instead of us timing out
// early and leaving the user with no explanation. The 11-minute window is a
// deliberate overrun, not a bug.
const POLL_TIMEOUT_MS = 11 * 60 * 1000;

const PAIRING_STATE_KEY = "screenboltPairing";
export const DEVICE_TOKEN_KEY = "screenboltDeviceToken";

// Guards against two overlapping poll loops if the user (re-)triggers
// pairing again while an earlier attempt is still polling.
let activePollToken = 0;

const setPairingState = async (patch) => {
  const { [PAIRING_STATE_KEY]: current } = await chrome.storage.local.get([
    PAIRING_STATE_KEY,
  ]);
  await chrome.storage.local.set({
    [PAIRING_STATE_KEY]: {
      ...(current || {}),
      ...patch,
      updatedAt: Date.now(),
    },
  });
};

export const getPairingState = async () => {
  const { [PAIRING_STATE_KEY]: state, [DEVICE_TOKEN_KEY]: token } =
    await chrome.storage.local.get([PAIRING_STATE_KEY, DEVICE_TOKEN_KEY]);
  return { ...(state || { status: "idle" }), hasToken: Boolean(token) };
};

export const getDeviceToken = async () => {
  const { [DEVICE_TOKEN_KEY]: token } = await chrome.storage.local.get([
    DEVICE_TOKEN_KEY,
  ]);
  return token || null;
};

export const clearDevicePairing = async () => {
  activePollToken += 1; // stop any in-flight poll loop from writing state after this
  await chrome.storage.local.remove([DEVICE_TOKEN_KEY, PAIRING_STATE_KEY]);
  try {
    await chrome.alarms?.clear(PAIRING_POLL_ALARM);
  } catch {
    // alarms permission may not be granted; nothing to clear then.
  }
  return { status: "cleared" };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Matches apps/web's initSchema: code must be a UUID. crypto.randomUUID is
// available in MV3 service workers (secure context); the fallback only exists
// as a belt-and-braces path that shouldn't normally run.
const generatePairingCode = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // UUID v4: version bits
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // UUID v4: variant bits
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const clearPairingAlarm = async () => {
  try {
    await chrome.alarms?.clear(PAIRING_POLL_ALARM);
  } catch {
    // best-effort
  }
};

// One GET /pair/status round trip. On a terminal outcome (approved/expired)
// it persists state and returns it; on "pending" (or a transient failure) it
// returns { status: "pending" } so callers keep polling.
const checkPairingOnce = async (code) => {
  let res;
  try {
    res = await fetch(
      `${WEB_APP_URL}/api/extension/pair/status?code=${encodeURIComponent(code)}`,
    );
  } catch (err) {
    diagEvent("pairing-poll-network-error", {
      error: String(err?.message || err).slice(0, 120),
    });
    return { status: "pending" };
  }

  if (res.status === 404) {
    await setPairingState({ status: "expired", code });
    return { status: "expired" };
  }

  if (!res.ok) {
    diagEvent("pairing-poll-http-error", { status: res.status });
    return { status: "pending" };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    return { status: "pending" };
  }

  if (data?.status === "approved") {
    // The server hands the token back exactly once, then clears it
    // server-side (see apps/web's GET /api/extension/pair/status). The fast
    // poll loop and the once-a-minute alarm backstop both call this
    // function, so it's possible for the *other* one to have already
    // claimed the token by the time this response lands -- token is null
    // then, but "approved" is still terminal either way.
    if (data.token) {
      await chrome.storage.local.set({ [DEVICE_TOKEN_KEY]: data.token });
    }
    await setPairingState({ status: "approved", code });
    diagEvent("pairing-approved");
    return { status: "approved" };
  }

  if (data?.status === "expired") {
    await setPairingState({ status: "expired", code });
    return { status: "expired" };
  }

  return { status: "pending" };
};

// Fast in-memory poll loop. Runs detached (fire-and-forget from the message
// handler's point of view) while this service worker instance stays alive.
// The PAIRING_POLL_ALARM backstop (see handleAlarm.js) covers the case where
// the worker is torn down mid-wait.
async function pollForApproval(code, pollToken) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    if (pollToken !== activePollToken) return; // superseded by a newer pairing attempt

    const result = await checkPairingOnce(code);
    if (result.status !== "pending") {
      await clearPairingAlarm();
      return;
    }
  }

  if (pollToken === activePollToken) {
    // Don't clobber an approved state: if the alarm backstop observed
    // approval (and stored the token) while this loop was still alive, a
    // late timeout write would otherwise overwrite "approved" with
    // "timeout" and make the UI report failure after a successful pairing.
    const current = await getPairingState();
    if (current.status !== "approved") {
      await setPairingState({ status: "timeout", code });
    }
    await clearPairingAlarm();
  }
}

// Backstop invoked once a minute by handleAlarm.js. Independent of the fast
// loop above -- it re-reads whatever pairing is current in storage, so it
// still makes progress even if the fast loop's setTimeout chain died with a
// suspended service worker.
export const runPairingAlarmBackstop = async () => {
  const state = await getPairingState();
  if (state.status !== "pending" || !state.code) {
    await clearPairingAlarm();
    return;
  }
  if (Date.now() - (state.startedAt || 0) > POLL_TIMEOUT_MS) {
    await setPairingState({ status: "timeout", code: state.code });
    await clearPairingAlarm();
    return;
  }
  const result = await checkPairingOnce(state.code);
  if (result.status !== "pending") {
    await clearPairingAlarm();
  }
};

// Best-effort: the "alarms" permission is optional (see manifest.json), only
// granted so far when the user starts a recording. Requesting it here is
// gated on the pairing button's own click (a user gesture), same pattern as
// checkCapturePermissions() elsewhere in this codebase. Failure just means
// the fast in-memory loop is the only poll mechanism for this attempt.
const ensureAlarmsPermission = async () => {
  if (!chrome.permissions) return false;
  try {
    const has = await new Promise((resolve) =>
      chrome.permissions.contains({ permissions: ["alarms"] }, resolve),
    );
    if (has) return true;
    const granted = await new Promise((resolve) =>
      chrome.permissions.request({ permissions: ["alarms"] }, resolve),
    );
    if (granted) addAlarmListener();
    return Boolean(granted);
  } catch {
    return false;
  }
};

// Kicks off a pairing attempt: mints a code, opens the /connect tab, and
// starts polling. Resolves quickly (after init + opening the tab) with
// { status: "pending", code } -- it does NOT wait for the up-to-5-minute
// approval wait, since the caller (e.g. the popup) may unmount as soon as
// the new tab steals focus. The actual poll (fast loop + alarm backstop)
// keeps running in the background regardless.
export const startDevicePairing = async () => {
  const pollToken = ++activePollToken;

  await setPairingState({ status: "starting", code: null, error: null });

  let code = null;
  try {
    // Generate the code locally (the spec's model: the extension owns the
    // unguessable handoff identifier). Retry once or twice on 409, which is
    // the server's "code already in use" response -- astronomically unlikely
    // with a fresh UUID, but regenerate rather than fail.
    for (let attempt = 0; attempt < 3 && !code; attempt += 1) {
      const candidate = generatePairingCode();
      const res = await fetch(`${WEB_APP_URL}/api/extension/pair/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: candidate }),
      });
      if (res.status === 409) continue;
      if (!res.ok) {
        throw new Error(`pair/init failed (${res.status})`);
      }
      const data = await res.json();
      code = data?.code || candidate;
    }
    if (!code) throw new Error("pair/init failed after retries (409)");
  } catch (err) {
    const message = String(err?.message || err);
    console.warn("[Screenbolt][Pairing] init failed:", message);
    await setPairingState({ status: "error", error: message });
    diagEvent("pairing-init-failed", { error: message.slice(0, 120) });
    return { status: "error", error: message };
  }

  await setPairingState({
    status: "pending",
    code,
    error: null,
    startedAt: Date.now(),
  });
  diagEvent("pairing-started");

  try {
    chrome.tabs.create({
      url: `${WEB_APP_URL}/connect?code=${encodeURIComponent(code)}`,
      active: true,
    });
  } catch (err) {
    console.warn("[Screenbolt][Pairing] failed to open /connect tab:", err);
  }

  const alarmsGranted = await ensureAlarmsPermission();
  if (alarmsGranted) {
    try {
      await chrome.alarms.create(PAIRING_POLL_ALARM, { periodInMinutes: 1 });
    } catch (err) {
      console.warn("[Screenbolt][Pairing] failed to arm poll alarm:", err);
    }
  }

  // Detached: the caller gets { status: "pending", code } immediately.
  void pollForApproval(code, pollToken);

  return { status: "pending", code };
};
