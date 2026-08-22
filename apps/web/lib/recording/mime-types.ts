// MediaRecorder mimeType candidates, best-first. Adapted from old
// Screenbolt's useScreenRecording hook (see docs/specs/06-web-recording.md)
// but widened to try more codec combos before falling back to the
// browser's unqualified default, since support varies a lot across
// Chrome/Firefox/Safari.
const CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
];

export function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const candidate of CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return undefined; // let MediaRecorder pick its own default
}
