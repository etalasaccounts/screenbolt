import { WEB_APP_URL } from "../webApp/config.js";

/**
 * Fetches the current user's plan limits from the web app.
 * Called once when recording starts.
 *
 * @param {string} appBaseUrl - e.g. "https://screenbolt.app"
 * @returns {Promise<{maxDurationSeconds: number|null}>}
 */
export async function fetchPlanLimits(appBaseUrl = WEB_APP_URL) {
  try {
    const res = await fetch(`${appBaseUrl}/api/billing/plan`, {
      credentials: "include",
    });
    if (!res.ok) return { maxDurationSeconds: 300 };
    const data = await res.json();
    return { maxDurationSeconds: data?.data?.limits?.maxDurationSeconds ?? 300 };
  } catch {
    return { maxDurationSeconds: 300 };
  }
}

/**
 * Returns true if the recording has exceeded the plan's duration limit.
 *
 * @param {number} startTimestamp - Date.now() when recording started
 * @param {number|null} maxDurationSeconds - null means unlimited
 * @returns {boolean}
 */
export function checkDurationLimit(startTimestamp, maxDurationSeconds) {
  if (maxDurationSeconds === null) return false;
  const elapsed = (Date.now() - startTimestamp) / 1000;
  return elapsed >= maxDurationSeconds;
}
