import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/server-auth";
import { EditorFrameClient } from "./editor-frame-client";

// Deliberately outside app/(home) -- this route is only ever loaded inside
// the iframe rendered by components/record/record-flow.tsx, as a real
// top-level page/document (not embedded in the (home) route group's shared
// chrome), so packages/editor's global stylesheet can own its whole
// document the way editor.html does in apps/extension without leaking onto
// the rest of the site. See components/record/editor/shared-editor.tsx.
export default async function EditorFramePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.activeWorkspaceId) redirect("/account");

  return <EditorFrameClient />;
}
