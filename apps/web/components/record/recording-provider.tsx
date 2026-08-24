"use client";

// Recording state + its floating UI, lifted to the (home) layout so a
// recording survives client-side navigation between pages within
// Screenbolt (/home, /account, ...) — matching how the previous
// Screenbolt app's RecordControls worked (see
// /Users/riaenriala/Documents/etalas/screenbolt/components/record-button.tsx
// and record-controls.tsx): the floating controls are portaled straight
// into document.body from a component mounted once at the app-shell level.
//
// Flow now strictly mirrors the extension's actual sequence (not an invented
// one) -- clicking "Record" opens the floating source panel FIRST, in a
// preparation state (pick a recording type, camera, mic — nothing is
// captured yet), and the real "Start recording" trigger lives INSIDE that
// panel. Only once that's clicked does the browser's actual screen-share
// picker (or camera-only capture) begin, followed by the countdown, then
// the recording itself with the separate bottom control bar. There is no
// dedicated /record page anymore -- "Record" is an action (open the
// panel), triggered from wherever (navbar, the home page's CTA), not a
// destination.
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { useScreenRecorder } from "@/lib/recording/use-screen-recorder";
import { CountdownOverlay } from "./countdown-overlay";
import { ControlBar } from "./control-bar";
import { SourcePanel } from "./source-panel";
import { CameraBubble } from "./camera-bubble";
import { EditingView } from "./editor/editing-view";

type Phase = "idle" | "preparing" | "countdown" | "recording" | "editing";

interface RecordingContextValue {
  phase: Phase;
  openPanel: () => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}

const noopSubscribe = () => () => {};

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  // Client-only mount detection without an effect+setState (flagged by
  // this repo's lint config, react-hooks/set-state-in-effect) --
  // useSyncExternalStore's server snapshot is used for both the server
  // render and the client's first hydrating render, then React re-invokes
  // getSnapshot right after hydration, flipping this true. Same effect as
  // the old app's `useEffect(() => setIsMounted(true), [])`.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [starting, setStarting] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingType, setRecordingType] = useState<"screen" | "camera">("screen");

  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  const handleScreenShareEnded = useCallback(() => {
    if (phaseRef.current === "recording" || phaseRef.current === "countdown") {
      void handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recorder = useScreenRecorder({ onScreenShareEnded: handleScreenShareEnded });

  // Keep a stable ref to the recorder so we can clean up on unmount
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  // Clean up all acquired media streams and stop any active recording when
  // the provider unmounts. This is critical for cross-layout navigation: if
  // the user navigates from the (home) layout to the /d layout (which have
  // separate RecordingProvider instances), the home layout's provider unmounts
  // and must release its MediaStreams, otherwise the browser will keep the
  // camera/screen share indicator on indefinitely.
  //
  // Empty dependency list: we want this cleanup to run exactly once on unmount.
  // The recorderRef captures the current recorder instance, so when the provider
  // unmounts, the cleanup function calls cancel() on the recorder that was
  // active at unmount time. This stops all tracks (screen, mic, camera, mixed
  // recorder stream) and the audio-mix cleanup, reusing the existing stopAllTracks
  // and stopCamera paths in the hook.
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
    };
  }, []);

  const openPanel = useCallback(() => {
    if (phaseRef.current !== "idle") return; // already mid-flow somewhere
    setPhase("preparing");
    void recorder.refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartFromPanel() {
    setStarting(true);
    const ok = await recorder.prepare({ mic: recorder.micEnabled, source: recordingType });
    setStarting(false);
    if (ok) setPhase("countdown");
  }

  function handleCountdownComplete() {
    const started = recorder.beginRecording();
    if (started) {
      setPhase("recording");
    } else {
      toast.error("Could not start recording");
      recorder.cancel();
      setPhase("idle");
    }
  }

  async function handleStop() {
    const result = await recorder.stop();
    if (!result) {
      toast.error("Recording failed — no data was captured");
      setPhase("idle");
      return;
    }
    setRecordedBlob(result.blob);
    setPhase("editing");
  }

  function handleDiscardEdit() {
    setRecordedBlob(null);
    recorder.cancel();
    setPhase("idle");
  }

  function handleCancelFromPanel() {
    recorder.cancel();
    setPhase("idle");
  }

  return (
    <RecordingContext.Provider value={{ phase, openPanel }}>
      {children}
      {mounted &&
        phase !== "idle" &&
        createPortal(
          <>
            {phase === "editing" && recordedBlob && (
              <EditingView blob={recordedBlob} onDiscard={handleDiscardEdit} />
            )}

            {phase === "preparing" && (
              <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
            )}

            {phase === "preparing" && (
              <SourcePanel
                mode="prepare"
                micEnabled={recorder.micEnabled}
                cameraEnabled={recorder.cameraEnabled}
                cameraOptions={recorder.cameraOptions}
                micOptions={recorder.micOptions}
                cameraDeviceId={recorder.cameraDeviceId}
                micDeviceId={recorder.micDeviceId}
                onSelectCamera={recorder.setCameraDeviceId}
                onSelectMic={recorder.setMicDeviceId}
                onToggleCamera={recorder.toggleCamera}
                onToggleMic={recorder.toggleMic}
                recordingType={recordingType}
                onSelectRecordingType={setRecordingType}
                onStart={handleStartFromPanel}
                starting={starting}
                error={recorder.error}
                onClose={handleCancelFromPanel}
              />
            )}

            {(phase === "countdown" || phase === "recording") && (
              <SourcePanel
                mode="live"
                micEnabled={recorder.micEnabled}
                cameraEnabled={recorder.cameraEnabled}
              />
            )}

            {phase === "countdown" && <CountdownOverlay onComplete={handleCountdownComplete} />}

            {(phase === "recording" || phase === "countdown") && recorder.cameraStream && (
              <CameraBubble stream={recorder.cameraStream} />
            )}

            {phase === "preparing" && (
              <button
                type="button"
                onClick={handleCancelFromPanel}
                className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-[0.8125rem] text-white backdrop-blur-md transition-colors hover:bg-black/85"
              >
                Cancel
              </button>
            )}

            {phase === "recording" && (
              <ControlBar
                status={recorder.status === "paused" ? "paused" : "recording"}
                elapsedMs={recorder.elapsedMs}
                micEnabled={recorder.micEnabled}
                cameraEnabled={recorder.cameraEnabled}
                onToggleMic={() => recorder.toggleMic(!recorder.micEnabled)}
                onToggleCamera={() => recorder.toggleCamera(!recorder.cameraEnabled)}
                onPause={recorder.pause}
                onResume={recorder.resume}
                onStop={handleStop}
                onCancel={handleCancelFromPanel}
              />
            )}
          </>,
          document.body,
        )}
    </RecordingContext.Provider>
  );
}
