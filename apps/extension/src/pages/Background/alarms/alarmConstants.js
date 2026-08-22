export const FIRST_CHUNK_WATCHDOG_ALARM = "first-chunk-watchdog";
export const RECORDER_KEEPALIVE_ALARM = "recorder-keepalive";
// Backstop for the device-pairing poll (pairing/pairingClient.js): MV3
// service workers can be evicted mid-poll during the up-to-5-minute wait for
// approval, so this 1-minute alarm re-wakes the worker to check status even
// if the in-memory setTimeout loop died with it.
export const PAIRING_POLL_ALARM = "screenbolt-pairing-poll";
