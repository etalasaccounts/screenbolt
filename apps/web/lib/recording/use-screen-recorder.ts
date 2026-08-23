"use client";

// Screen recording via getDisplayMedia + getUserMedia + MediaRecorder.
// Structure (mimeType fallback, stream validation, chunk collection,
// pause/resume) is informed by old Screenbolt's useScreenRecording /
// useRecordingManager hooks (see docs/specs/06-web-recording.md) but
// rewritten for React 19 without Redux, and split so capture (asking for
// permissions) and the actual MediaRecorder start are separate steps —
// the caller runs a countdown in between.
import { useCallback, useRef, useState } from "react";
import { pickSupportedMimeType } from "./mime-types";
import { mixAudioTracks } from "./audio-mixer";
import { fixWebmBlobDuration } from "@/lib/editor/fix-webm-duration";

export type RecorderStatus = "idle" | "ready" | "recording" | "paused" | "stopped";

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

interface UseScreenRecorderArgs {
  onScreenShareEnded?: () => void;
}

export interface DeviceOption {
  deviceId: string;
  label: string;
}

export function useScreenRecorder({ onScreenShareEnded }: UseScreenRecorderArgs = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraDeviceId, setCameraDeviceId] = useState<string | null>(null);
  const [micDeviceId, setMicDeviceId] = useState<string | null>(null);
  const [cameraOptions, setCameraOptions] = useState<DeviceOption[]>([]);
  const [micOptions, setMicOptions] = useState<DeviceOption[]>([]);

  // Device labels are only populated once a getUserMedia permission has
  // been granted at least once (browser privacy rule) -- call this again
  // after that happens to pick up real labels instead of "Camera 1" etc.
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      const mics = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
      setCameraOptions(cams);
      setMicOptions(mics);
      if (!cameraDeviceId && cams[0]) setCameraDeviceId(cams[0].deviceId);
      if (!micDeviceId && mics[0]) setMicDeviceId(mics[0].deviceId);
    } catch {
      // enumerateDevices itself can't really fail short of an ancient
      // browser without the API at all -- leave device lists empty rather
      // than surface an error for something this non-critical.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  // Which source beginRecording() should actually pull video from --
  // "screen" (screenStreamRef) or "camera" (cameraStreamRef, when
  // recording camera-only with no screen share at all). Set by prepare().
  const recordingSourceRef = useRef<"screen" | "camera">("screen");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioMixCleanupRef = useRef<() => void>(() => {});
  // Handler for the screen stream's "ended" event, stored to allow removal
  // when the stream is torn down or replaced.
  const screenStreamEndedHandlerRef = useRef<((event: Event) => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pausedAtRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    // Remove the screen stream's ended event listener before stopping the track
    if (screenStreamRef.current && screenStreamEndedHandlerRef.current) {
      screenStreamRef.current.getVideoTracks()[0]?.removeEventListener("ended", screenStreamEndedHandlerRef.current);
      screenStreamEndedHandlerRef.current = null;
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioMixCleanupRef.current();
    audioMixCleanupRef.current = () => {};
    screenStreamRef.current = null;
    micStreamRef.current = null;
    recorderStreamRef.current = null;
    // Camera-only recordings route the camera's own track through
    // recorderStreamRef, so it's already stopped above -- but that leaves
    // cameraStreamRef/cameraStream state pointing at a now-dead stream.
    // Reset camera state fully after any recording ends, same clean-slate
    // teardown the extension does.
    if (recordingSourceRef.current === "camera") {
      cameraStreamRef.current = null;
      setCameraStream(null);
      setCameraEnabled(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    setCameraStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    cameraStreamRef.current = null;
    setCameraEnabled(false);
  }, []);

  const toggleCamera = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        stopCamera();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 640 },
            ...(cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : {}),
          },
        });
        cameraStreamRef.current = stream;
        setCameraStream((prev) => {
          prev?.getTracks().forEach((t) => t.stop());
          return stream;
        });
        setCameraEnabled(true);
        void refreshDevices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not access camera");
        setCameraEnabled(false);
      }
    },
    [stopCamera, cameraDeviceId, refreshDevices],
  );

  const toggleMic = useCallback((enabled: boolean) => {
    setMicEnabled(enabled);
    micStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }, []);

  // Requests display + (optional) mic permission. Doesn't start
  // MediaRecorder yet, so the caller can run a countdown first. `audio:
  // true` on getDisplayMedia is what makes Chrome's native picker offer a
  // "Share tab audio" checkbox — whether a system-audio track actually
  // ends up on the stream is the user's choice in that picker, not ours.
  const prepare = useCallback(
    async (opts: { mic: boolean; source?: "screen" | "camera" }) => {
      setError(null);
      const source = opts.source ?? "screen";
      recordingSourceRef.current = source;
      try {
        if (source === "screen") {
          // If a previous screen stream exists, remove its ended event listener
          if (screenStreamRef.current && screenStreamEndedHandlerRef.current) {
            screenStreamRef.current.getVideoTracks()[0]?.removeEventListener("ended", screenStreamEndedHandlerRef.current);
            screenStreamEndedHandlerRef.current = null;
          }

          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          if (!screenStream.active) throw new Error("Screen sharing was not granted");

          // Create and store the handler so it can be removed later
          const handler = () => {
            onScreenShareEnded?.();
          };
          screenStreamEndedHandlerRef.current = handler;
          screenStream.getVideoTracks()[0]?.addEventListener("ended", handler);
          screenStreamRef.current = screenStream;
        } else {
          // Camera-only: no getDisplayMedia at all. Reuse the camera
          // stream if the panel's preview toggle already requested it;
          // otherwise request it now with the currently selected device.
          if (!cameraStreamRef.current) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 1280 },
                ...(cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : {}),
              },
            });
            cameraStreamRef.current = stream;
            setCameraStream(stream);
            setCameraEnabled(true);
          }
          if (!cameraStreamRef.current.active) throw new Error("Camera access was not granted");
        }

        if (opts.mic) {
          try {
            micStreamRef.current = await navigator.mediaDevices.getUserMedia({
              audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
            });
            void refreshDevices();
          } catch (err) {
            console.warn("Mic permission denied or unavailable:", err);
            micStreamRef.current = null;
          }
        }
        setMicEnabled(!!micStreamRef.current);

        setStatus("ready");
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : source === "screen"
              ? "Could not start screen capture"
              : "Could not start camera",
        );
        setStatus("idle");
        return false;
      }
    },
    [onScreenShareEnded, micDeviceId, cameraDeviceId, refreshDevices],
  );

  const beginRecording = useCallback(() => {
    const videoSourceStream =
      recordingSourceRef.current === "screen" ? screenStreamRef.current : cameraStreamRef.current;
    if (!videoSourceStream) {
      setError(recordingSourceRef.current === "screen" ? "No active screen stream" : "No active camera stream");
      return false;
    }

    const audioTracks = [
      ...videoSourceStream.getAudioTracks(),
      ...(micStreamRef.current?.getAudioTracks() ?? []),
    ];
    const mixed = mixAudioTracks(audioTracks);
    if (mixed) audioMixCleanupRef.current = mixed.cleanup;

    const combined = new MediaStream([
      ...videoSourceStream.getVideoTracks(),
      ...(mixed ? [mixed.track] : []),
    ]);
    recorderStreamRef.current = combined;

    const mimeType = pickSupportedMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(combined, { mimeType }) : new MediaRecorder(combined);
    } catch (err) {
      console.warn("MediaRecorder failed with chosen mimeType, retrying with default:", err);
      recorder = new MediaRecorder(combined);
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;

    startedAtRef.current = Date.now();
    pausedAccumRef.current = 0;
    setElapsedMs(0);
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current - pausedAccumRef.current);
    }, 250);

    setStatus("recording");
    return true;
  }, [stopTimer]);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== "recording") return;
    recorder.pause();
    pausedAtRef.current = Date.now();
    stopTimer();
    setStatus("paused");
  }, [stopTimer]);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== "paused") return;
    recorder.resume();
    pausedAccumRef.current += Date.now() - pausedAtRef.current;
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current - pausedAccumRef.current);
    }, 250);
    setStatus("recording");
  }, []);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    const recorder = mediaRecorderRef.current;
    stopTimer();
    if (!recorder || recorder.state === "inactive") {
      stopAllTracks();
      return null;
    }

    const durationMs = Date.now() - startedAtRef.current - pausedAccumRef.current;
    const mimeType = recorder.mimeType || "video/webm";
    // The shared editor (packages/editor, ported from the extension) does
    // strict `blob.type === "video/webm"` / `"video/mp4"` checks in a few
    // places (ContentState.reconstructVideo's isFastWebm gate) to decide
    // how to load a recording -- MediaRecorder's actual mimeType includes
    // codec parameters (e.g. "video/webm;codecs=vp9,opus"), which fails
    // that strict comparison and silently routes every web recording down
    // a slow/extension-only path that has no way to actually finish here.
    // The codec info isn't needed on the Blob's type for playback (it's
    // encoded in the container itself); strip to the bare MIME type the extension
    // expects.
    const baseMimeType = mimeType.split(";")[0].trim();

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (chunksRef.current.length === 0) return resolve(null);
        resolve(new Blob(chunksRef.current, { type: baseMimeType }));
      };
      recorder.stop();
    });

    stopAllTracks();
    setStatus("stopped");

    if (!blob) return null;

    const fixed = await fixWebmBlobDuration(blob, durationMs);
    return { blob: fixed, durationMs, mimeType };
  }, [stopAllTracks, stopTimer]);

  const cancel = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    stopAllTracks();
    stopCamera();
    setStatus("idle");
    setElapsedMs(0);
  }, [stopAllTracks, stopCamera, stopTimer]);

  return {
    status,
    elapsedMs,
    error,
    micEnabled,
    cameraEnabled,
    cameraStream,
    cameraOptions,
    micOptions,
    cameraDeviceId,
    micDeviceId,
    setCameraDeviceId,
    setMicDeviceId,
    refreshDevices,
    prepare,
    beginRecording,
    pause,
    resume,
    stop,
    cancel,
    toggleMic,
    toggleCamera,
  };
}
