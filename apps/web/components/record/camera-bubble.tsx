"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 168;
const MARGIN = 24;

/**
 * Floating camera preview — a plain DOM <video> element positioned over
 * the page, not composited into the recording (see docs/specs/06-web-recording.md
 * for why: no canvas compositing, so this bubble is only ever part of the
 * captured pixels when the user is recording the tab it's rendered on).
 * Draggable within the viewport so it doesn't have to sit on top of
 * whatever the user is demonstrating.
 */
export function CameraBubble({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Lazy initializer instead of an effect: this component only ever
  // mounts client-side (only rendered once a live MediaStream exists), so
  // `window` is always available here.
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({
    x: window.innerWidth - SIZE - MARGIN,
    y: window.innerHeight - SIZE - MARGIN - 96,
  }));
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const { startX, startY, originX, originY } = dragState.current;
    const nextX = originX + (e.clientX - startX);
    const nextY = originY + (e.clientY - startY);
    setPos({
      x: Math.min(Math.max(nextX, MARGIN), window.innerWidth - SIZE - MARGIN),
      y: Math.min(Math.max(nextY, MARGIN), window.innerHeight - SIZE - MARGIN),
    });
  }

  function onPointerUp() {
    dragState.current = null;
  }

  return (
    <div
      className="fixed z-50 cursor-grab touch-none overflow-hidden rounded-full border-4 border-white shadow-[0_16px_48px_rgba(0,0,0,.35)] active:cursor-grabbing"
      style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
    </div>
  );
}
