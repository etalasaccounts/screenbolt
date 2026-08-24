// MediaRecorder mimeType candidates. Prefer MP4 (H.264+AAC) over WebM to
// ensure reliable playback across Safari and other browsers. VFR VP9/WebM
// breaks downstream (Bunny drops frames, node-av SIGSEGVs), so MP4 is
// preferred when possible. This logic is ported from
// apps/extension/src/pages/utils/recorderCodec.js — see that file for the
// full rationale and implementation history.
//
// Adapted from old Screenbolt's useScreenRecording hook
// (see docs/specs/06-web-recording.md) but now MP4-first and with stream
// probing to catch Windows/Chrome regressions where isTypeSupported returns
// true but start() throws NotSupportedError.

const MP4_MIME = "video/mp4;codecs=avc1.42E01E,mp4a.40.2";

// Fallbacks, best-first, used when MP4 is unavailable. The bare "video/mp4"
// at the end is a last resort for browsers that support an MP4 container but
// not the explicit avc1/AAC codec string above.
const FALLBACK_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
  "video/mp4",
];

// MediaRecorder.isTypeSupported() returning true does not guarantee that
// start() will succeed. Some Windows/Chrome installs advertise the avc1 mime
// and then throw NotSupportedError from start(), which would kill the entire
// recording. This helper probes the real stream by constructing a
// MediaRecorder, calling start(), and returning false if that throws. It
// always stops the probe recorder in a finally block (guarding state !==
// "inactive"), and swallows errors from stopping.
export function canStartMp4Recorder(stream: MediaStream, mime: string): boolean {
  if (!stream || typeof MediaRecorder === "undefined") return true;
  let probe: MediaRecorder | null = null;
  try {
    probe = new MediaRecorder(stream, { mimeType: mime });
    probe.start();
    return true;
  } catch {
    return false;
  } finally {
    try {
      if (probe && probe.state !== "inactive") probe.stop();
    } catch {
      // Swallow errors from stopping the probe
    }
  }
}

export function pickSupportedMimeType(stream?: MediaStream): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  // Try MP4 first if stream is provided and probe succeeds
  if (stream && MediaRecorder.isTypeSupported(MP4_MIME) && canStartMp4Recorder(stream, MP4_MIME)) {
    return MP4_MIME;
  }

  // When stream is not provided, try MP4 on isTypeSupported alone (without probe)
  if (!stream && MediaRecorder.isTypeSupported(MP4_MIME)) {
    return MP4_MIME;
  }

  for (const candidate of FALLBACK_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }

  return undefined; // let MediaRecorder pick its own default
}
