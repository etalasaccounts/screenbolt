import React from "react";
import { createRoot } from "react-dom/client";

// editor renders directly in editor.html (no sandbox.html iframe); heavy mediabunny ops run in-process via editorOps
// EditorApp/ContentState now live in packages/editor (shared with apps/web,
// see docs/specs/07-shared-editor.md) and are resolved via the
// "@screenbolt/editor" webpack alias below. EditorPageBridge and the
// videoSource/saveDestination adapters stay here — they're the extension's
// own I/O, injected into the shared UI rather than baked into it.
import ContentState from "@screenbolt/editor/context/ContentState";
import EditorApp from "@screenbolt/editor/EditorApp";
import EditorPageBridge from "./EditorPageBridge";
import { extensionVideoSource, extensionSaveDestination } from "./editorAdapters";

// Find the container to render into
const container = window.document.querySelector("#app-container");

if (container) {
  const root = createRoot(container);
  root.render(
    <ContentState
      videoSource={extensionVideoSource}
      saveDestination={extensionSaveDestination}
    >
      <EditorApp />
      <EditorPageBridge />
    </ContentState>
  );
}

// Hot Module Replacement
if (module.hot) {
  module.hot.accept();
}
