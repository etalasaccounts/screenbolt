// The web recorder can have two simultaneous audio sources — tab/system
// audio from getDisplayMedia({ audio: true }) and mic audio from
// getUserMedia. Chrome's MediaRecorder does not reliably mix multiple
// audio tracks living on one MediaStream (in practice it silently drops
// all but one), so mix them into a single track with the Web Audio API
// before handing the stream to MediaRecorder. New code — neither
// reference codebase needed this since they never combine two live audio
// sources. See docs/specs/06-web-recording.md.
export function mixAudioTracks(tracks: MediaStreamTrack[]): {
  track: MediaStreamTrack;
  cleanup: () => void;
} | null {
  const usable = tracks.filter(Boolean);
  if (usable.length === 0) return null;

  if (usable.length === 1) {
    return { track: usable[0], cleanup: () => {} };
  }

  const AudioContextCtor: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const destination = audioContext.createMediaStreamDestination();

  const sources = usable.map((track) => {
    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
    source.connect(destination);
    return source;
  });

  const [mixedTrack] = destination.stream.getAudioTracks();

  const cleanup = () => {
    sources.forEach((source) => source.disconnect());
    destination.disconnect();
    audioContext.close().catch(() => {});
  };

  return { track: mixedTrack, cleanup };
}
