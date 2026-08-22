"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// packages/editor pulls in plyr-react, which touches `document` at module
// load time -- fine in apps/extension (always client-side, no SSR concept),
// but Next.js still evaluates client-component module graphs on the server
// for the initial render, which crashes with "document is not defined"
// before this component ever gets a chance to render. `ssr: false` keeps
// the whole module out of the server bundle entirely.
const SharedEditor = dynamic(
  () => import("@/components/record/editor/shared-editor").then((m) => m.SharedEditor),
  { ssr: false },
);

// Handshake with the parent page (components/record/record-flow.tsx):
// announce readiness, then wait for the parent to hand over the just-
// finished recording as a real Blob (structured-cloneable via postMessage,
// so no blob: URL lifetime juggling across documents). Origin-checked both
// ways since this is a same-origin-only handoff.
export function EditorFrameClient() {
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "screenbolt-editor-init" && event.data.blob instanceof Blob) {
        setBlob(event.data.blob);
      }
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "screenbolt-editor-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!blob) return null;

  return (
    <SharedEditor
      blob={blob}
      onUploaded={(video) => {
        // Terminal action -- leave the SPA/iframe entirely rather than try
        // to thread a client-side router navigation across the iframe
        // boundary.
        window.top!.location.href = `/watch/${video.id}`;
      }}
    />
  );
}
