"use client";

import { useEffect, useRef } from "react";

function getSessionId(): string {
  const KEY = "sb_session_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function ViewTracker({ videoId }: { videoId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/video-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, sessionId: getSessionId() }),
    }).catch(() => {
      /* view tracking is best-effort */
    });
  }, [videoId]);

  return null;
}
