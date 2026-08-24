"use client";

import { useState } from "react";
import { Rnd } from "react-rnd";
import { Icon } from "@iconify/react";
import { formatDuration } from "@/lib/client/format";

// Draggable, matching apps/extension's real recording toolbar
// (ToolbarWrap.jsx wraps its controls in <Rnd> with a grab handle on the
// left) rather than a fixed-position bar — this is the extension's real
// interaction pattern, not a stylistic choice invented here.
export function ControlBar({
  status,
  elapsedMs,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onPause,
  onResume,
  onStop,
  onCancel,
}: {
  status: "recording" | "paused";
  elapsedMs: number;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  const paused = status === "paused";

  // Default to bottom-center on first mount, exactly like where the fixed
  // pill used to sit, but as a real starting position Rnd owns from then
  // on (draggable anywhere after) — mirroring PopupContainer.jsx computing
  // its own start position from window dimensions on mount.
  const [initial] = useState(() => ({
    x: typeof window === "undefined" ? 0 : window.innerWidth / 2 - 180,
    y: typeof window === "undefined" ? 0 : window.innerHeight - 96,
  }));

  return (
    <Rnd
      default={{ ...initial, width: "auto", height: "auto" }}
      style={{ position: "fixed", zIndex: 50 }}
      enableResizing={false}
      dragHandleClassName="drag-handle"
      bounds="window"
    >
      <div
        className="flex items-center gap-1.5 rounded-full py-2 pl-2 pr-2"
        style={{
          // See the matching comment in source-panel.tsx -- no saturate()
          // boost, this floats over arbitrary recorded content too.
          background: "rgba(13,15,16,.72)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 18px 50px rgba(0,0,0,.40)",
        }}
      >
        <span
          className="drag-handle flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-white/25 active:cursor-grabbing"
          title="Drag to move"
        >
          <Icon icon="solar:menu-dots-bold" style={{ fontSize: "1rem" }} />
        </span>

        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            background: "#ff3b30",
            animation: paused ? "none" : "recPulse 1.6s ease-in-out infinite",
            opacity: paused ? 0.4 : 1,
          }}
        />
        <span className="w-[3.25rem] text-[0.875rem] font-normal leading-none tracking-tight text-white tabular-nums">
          {formatDuration(elapsedMs / 1000)}
        </span>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button
          type="button"
          onClick={onToggleMic}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 ${
            micEnabled ? "text-white/70" : "text-[#ff3b30]"
          }`}
        >
          <ToggleIcon icon="solar:microphone-linear" off={!micEnabled} />
        </button>
        <button
          type="button"
          onClick={onToggleCamera}
          title={cameraEnabled ? "Hide camera" : "Show camera"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10 ${
            cameraEnabled ? "text-white/70" : "text-white/30"
          }`}
        >
          <ToggleIcon icon="solar:videocamera-linear" off={!cameraEnabled} />
        </button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button
          type="button"
          onClick={paused ? onResume : onPause}
          title={paused ? "Resume" : "Pause"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10"
        >
          <Icon icon={paused ? "solar:play-bold" : "solar:pause-bold"} style={{ fontSize: "1.0625rem" }} />
        </button>
        <button
          type="button"
          onClick={onStop}
          title="Stop recording"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff3b30] transition-opacity hover:opacity-90"
        >
          <span className="h-2.5 w-2.5 rounded-[3px] bg-white" />
        </button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button
          type="button"
          onClick={onCancel}
          title="Cancel and discard"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/35 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <Icon icon="solar:trash-bin-minimalistic-linear" style={{ fontSize: "1rem" }} />
        </button>
      </div>
    </Rnd>
  );
}

// Solar has no crossed-out microphone or videocamera (`muted-linear` and
// `volume-cross-linear` are speakers), so the off state is the normal glyph
// with a slash drawn over it. The slash is plain currentColor with no
// background-coloured cut-out underneath: the bar is translucent glass over
// arbitrary recorded content, so a "cut" stroke would never match what is
// behind it.
function ToggleIcon({ icon, off }: { icon: string; off: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <Icon icon={icon} style={{ fontSize: "1.0625rem" }} />
      {off && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <line
            x1="4"
            y1="20"
            x2="20"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}
