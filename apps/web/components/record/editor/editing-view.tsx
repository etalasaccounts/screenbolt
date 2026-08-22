"use client";

// Hosts the extension's real editor (app/record/editor-frame -> SharedEditor,
// see docs/specs/07-shared-editor.md) in an iframe so its global stylesheet
// (packages/editor/styles/global/_app.scss targets bare `body`/`button`
// selectors, sized to own its whole page like apps/extension's editor.html
// does) can't leak onto the rest of the Screenbolt site. This component is
// just the host-side half of two handshakes over postMessage: handing the
// recording to the iframe as a real Blob once it announces readiness
// (structured-cloneable, so no cross-document blob: URL lifetime concerns),
// and discarding back to the library when the editor's own nav asks to
// (PlayerNav's logo/Cancel -> chrome.runtime.sendMessage("open-home") ->
// lib/editor/chrome-shim.ts forwards it here as "screenbolt-editor-discard").
import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

export function EditingView({ blob, onDiscard }: { blob: Blob; onDiscard: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "screenbolt-editor-ready") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "screenbolt-editor-init", blob },
          window.location.origin,
        );
        setReady(true);
        return;
      }
      // The real editor's own nav (PlayerNav's logo + Cancel button, real
      // extension UI) sends this via chrome.runtime.sendMessage's
      // "open-home" case -- see lib/editor/chrome-shim.ts. Replaces the
      // floating discard button this component used to render on top of
      // the iframe (redundant now that the editor's own nav has a working
      // Cancel, and it visually collided with that nav's logo).
      if (event.data?.type === "screenbolt-editor-discard") {
        onDiscard();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [blob, onDiscard]);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <iframe
        ref={iframeRef}
        src="/record/editor-frame"
        title="Video editor"
        className="h-full w-full border-0"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white">
          <Icon icon="solar:refresh-linear" className="animate-spin text-[#090b0c]/40" style={{ fontSize: "2rem" }} />
        </div>
      )}
    </div>
  );
}
