"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Click-to-rename title on /watch/[id] -- same PUT /api/videos/[id]
// endpoint components/shell/video-card.tsx's rename menu item uses. Only
// rendered as editable for the video's owner (see page.tsx); router.refresh()
// is correct here since /watch/[id] is still a Server Component (unlike
// /home, which fetches client-side via TanStack Query and needs query
// invalidation instead -- see the matching comment in video-card.tsx).
export function VideoTitle({
  videoId,
  title: initialTitle,
  editable,
}: {
  videoId: string;
  title: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      setRenaming(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast.success("Title updated");
      router.refresh();
    } catch {
      toast.error("Could not rename video");
      setTitle(initialTitle);
    } finally {
      setBusy(false);
      setRenaming(false);
    }
  }

  if (!editable) {
    return (
      <h1 className="text-[1.5rem] font-normal leading-tight tracking-tight md:text-[1.75rem]">
        {initialTitle}
      </h1>
    );
  }

  if (renaming) {
    return (
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveTitle();
          if (e.key === "Escape") {
            setTitle(initialTitle);
            setRenaming(false);
          }
        }}
        onBlur={saveTitle}
        autoFocus
        disabled={busy}
        className="w-full rounded-lg border border-black/[.15] bg-white px-2 py-1 text-[1.5rem] font-normal leading-tight tracking-tight outline-none md:text-[1.75rem]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRenaming(true)}
      title="Click to rename"
      className="rounded-lg text-left text-[1.5rem] font-normal leading-tight tracking-tight transition-colors hover:bg-black/[.04] md:text-[1.75rem]"
    >
      {initialTitle}
    </button>
  );
}
