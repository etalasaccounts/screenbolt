"use client";

// Renders the extension's real editor (packages/editor -- see
// docs/architecture.md's "Shared code" section and
// docs/specs/07-shared-editor.md) with apps/web's own adapters wired in.
// This intentionally does *not* render inline inside a normal app/(home)
// page: packages/editor/styles/global/_app.scss is a genuinely global
// stylesheet (it targets bare `body`/`button` selectors, sized for owning
// the *entire* page the way apps/extension's editor.html does) and would
// leak onto the rest of the Screenbolt site if it were bundled into a
// route that shares this app's root layout's document. See
// app/record/editor-frame/page.tsx, which this is meant to be mounted
// inside of, in its own iframe document -- the same "the editor owns its
// whole page" model apps/extension gets for free from editor.html being a
// separate top-level page.
import { useState } from "react";

// packages/editor is plain JS/JSX with `allowJs` on, so these resolve and
// type-check (loosely, as `any`) without needing `@ts-expect-error`.
import ContentState from "@screenbolt/editor/context/ContentState";
import EditorApp from "@screenbolt/editor/EditorApp";

import { installChromeShim } from "@/lib/editor/chrome-shim";
import { createWebVideoSource } from "@/lib/editor/video-source-adapter";
import { createWebSaveDestination } from "@/lib/editor/save-destination-adapter";

export function SharedEditor({
  blob,
  onUploaded,
}: {
  blob: Blob;
  onUploaded: (video: { id: string }) => void;
}) {
  // Must run before <ContentState>/<EditorApp> render (they call
  // chrome.i18n.getMessage(...) synchronously during render, not just in
  // effects) -- see chrome-shim.ts. A plain call in the render body, before
  // returning JSX, is early enough: React doesn't invoke a child
  // component's function until this component's own function has already
  // returned.
  installChromeShim();

  // Adapters must stay referentially stable across re-renders --
  // ContentState reads props.videoSource/saveDestination once during its
  // own mount-time effects, not reactively. Lazy useState (not useRef)
  // computes each exactly once without reading a ref's value during render.
  const [videoSource] = useState(() => createWebVideoSource(blob));
  const [saveDestination] = useState(() => createWebSaveDestination({ onUploaded }));

  return (
    <ContentState videoSource={videoSource} saveDestination={saveDestination}>
      <EditorApp />
    </ContentState>
  );
}
