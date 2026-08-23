"use client";

import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { Icon } from "@iconify/react";
import type { DeviceOption } from "@/lib/recording/use-screen-recorder";

// Draggable top-right panel, matching apps/extension's real recording
// popup (PopupContainer.jsx -> RecordingTab.jsx -> RecordingType.jsx: a
// draggable panel, ~356px wide, that IS the preparation step -- it's what
// shows the moment you click the extension icon, BEFORE any actual screen
// capture starts. You pick a recording type (screen/tab/camera), pick a
// specific camera and microphone from real enumerated devices, then click
// "Start recording" *inside this panel* -- only then does the actual
// capture begin. This component now follows that same structure and
// sequence, not an invented one: "prepare" mode is that pre-recording
// config screen; "live" mode is the lighter status view the extension's popup
// shows once recording is actually underway (the real controls at that
// point are the separate bottom toolbar, ControlBar in this codebase).
//
// Deliberately NOT replicated (no web equivalent, not simplified --
// dropped): Pro/subscription gating, multi-scene recording, push-to-talk,
// MediaPipe camera background blur. "Tab area" (the extension's in-tab region
// capture) is shown as a disabled option with a short explanation rather
// than silently omitted, since chrome.tabCapture / CropTarget region
// capture has no plain-web equivalent.
export function SourcePanel({
  mode,
  micEnabled,
  cameraEnabled,
  cameraOptions,
  micOptions,
  cameraDeviceId,
  micDeviceId,
  onSelectCamera,
  onSelectMic,
  recordingType,
  onSelectRecordingType,
  onStart,
  starting,
  error,
  onClose,
}: {
  mode: "prepare" | "live";
  micEnabled: boolean;
  cameraEnabled: boolean;
  cameraOptions?: DeviceOption[];
  micOptions?: DeviceOption[];
  cameraDeviceId?: string | null;
  micDeviceId?: string | null;
  onSelectCamera?: (deviceId: string) => void;
  onSelectMic?: (deviceId: string) => void;
  recordingType?: "screen" | "camera";
  onSelectRecordingType?: (type: "screen" | "camera") => void;
  onStart?: () => void;
  starting?: boolean;
  error?: string | null;
  onClose?: () => void;
}) {
  const [initial] = useState(() => ({
    x: typeof window === "undefined" ? 0 : window.innerWidth - 320 - 28,
    y: 32,
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "prepare" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, onClose]);

  if (mode === "live") {
    return null;
  }

  return (
    <Rnd
      default={{ ...initial, width: 320, height: "auto" }}
      style={{ position: "fixed", zIndex: 50 }}
      enableResizing={false}
      dragHandleClassName="drag-handle"
      bounds="window"
    >
      <div
        className="overflow-hidden rounded-[22px] p-3"
        style={{
          // No saturate() boost here (unlike a typical frosted-glass
          // recipe) -- this panel floats over an arbitrary, unpredictable
          // desktop/tab while recording, and boosting saturation of
          // whatever's behind it can blow out into a distracting colored
          // glow depending on what's underneath.
          background: "rgba(13,15,16,.72)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 18px 50px rgba(0,0,0,.40)",
        }}
      >
        <div className="drag-handle mb-2 flex cursor-grab items-center justify-between px-1 active:cursor-grabbing">
          <span className="text-[0.6875rem] font-normal uppercase tracking-[0.12em] text-white/45">
            New recording
          </span>
          <Icon icon="solar:menu-dots-bold" style={{ fontSize: "0.875rem" }} className="text-white/25" />
        </div>

        <div className="mb-3 flex gap-2" role="group" aria-label="Recording source">
          <button
            type="button"
            onClick={() => onSelectRecordingType?.("screen")}
            disabled={starting}
            aria-pressed={recordingType === "screen"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              recordingType === "screen"
                ? "bg-white/[.20] text-white"
                : "bg-white/[.08] text-white/80 hover:bg-white/[.16]"
            }`}
          >
            <Icon icon="solar:monitor-linear" style={{ fontSize: "0.9375rem" }} />
            Screen
          </button>
          <button
            type="button"
            onClick={() => onSelectRecordingType?.("camera")}
            disabled={starting}
            aria-pressed={recordingType === "camera"}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              recordingType === "camera"
                ? "bg-white/[.20] text-white"
                : "bg-white/[.08] text-white/80 hover:bg-white/[.16]"
            }`}
          >
            <Icon icon="material-symbols:videocam" style={{ fontSize: "0.9375rem" }} />
            Camera
          </button>
        </div>

        <DeviceRow
          icon={cameraEnabled ? "material-symbols:videocam" : "material-symbols:videocam-off"}
          label="Camera"
          enabled={cameraEnabled}
          options={cameraOptions ?? []}
          selected={cameraDeviceId ?? null}
          onSelect={onSelectCamera}
          noneLabel="No camera"
        />
        <DeviceRow
          icon={micEnabled ? "solar:microphone-large-linear" : "solar:microphone-slash-linear"}
          label="Microphone"
          enabled={micEnabled}
          options={micOptions ?? []}
          selected={micDeviceId ?? null}
          onSelect={onSelectMic}
          noneLabel="No microphone"
        />

        {error && (
          <p className="mt-2 rounded-lg bg-red-500/15 px-2.5 py-2 text-[0.75rem] text-red-200">{error}</p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[0.875rem] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Icon icon="solar:record-circle-fill" style={{ fontSize: "1.0625rem" }} />
          {starting ? "Waiting for permission…" : "Start recording"}
        </button>
        <p className="mt-2 text-center text-[0.6875rem] text-white/35">
          {recordingType === "camera"
            ? "Records from your camera only."
            : "Your browser will ask what to share."}
        </p>
      </div>
    </Rnd>
  );
}

function EnableDevicePrompt({ label }: { label: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="mt-1.5 flex items-center justify-between">
      <span className="text-[0.6875rem] text-white/50">{label} is disabled</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-[0.6875rem] text-white/50 underline hover:text-white/70"
        >
          Enable
        </button>
        {showTooltip && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
            <div className="absolute top-full right-0 mt-2 z-50 rounded-lg bg-[#090b0c] px-3 py-2 text-[0.6875rem] text-white/80 border border-white/20 w-56">
              Check your browser permissions for {label.toLowerCase()}. You may need to allow access in your browser settings.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeviceRow({
  icon,
  label,
  enabled,
  options,
  selected,
  onSelect,
  noneLabel,
}: {
  icon: string;
  label: string;
  enabled: boolean;
  options: DeviceOption[];
  selected: string | null;
  onSelect?: (deviceId: string) => void;
  noneLabel: string;
}) {
  const selectedLabel = options.find((o) => o.deviceId === selected)?.label ?? noneLabel;

  return (
    <div className="mb-2 rounded-xl bg-white/[.06] px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon={icon} style={{ fontSize: "0.9375rem" }} className={enabled ? "text-white" : "text-white/35"} />
          <span className="truncate text-[0.9375rem] font-medium text-white/90">{label}</span>
        </div>
      </div>
      {enabled && options.length > 0 && (
        <select
          value={selected ?? ""}
          onChange={(e) => onSelect?.(e.target.value)}
          className="mt-1.5 w-full rounded-lg border-0 bg-white/[.08] px-2 py-1.5 text-[0.8125rem] text-white/85 outline-none"
        >
          {options.map((opt) => (
            <option key={opt.deviceId} value={opt.deviceId} className="text-black">
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {enabled && options.length === 0 && (
        <p className="mt-1.5 text-[0.6875rem] text-white/35">{selectedLabel}</p>
      )}
      {!enabled && <EnableDevicePrompt label={label} />}
    </div>
  );
}

