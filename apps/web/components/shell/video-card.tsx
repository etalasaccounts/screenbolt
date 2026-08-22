"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

import { formatDuration, formatDate } from "@/lib/client/format";

interface VideoCardData {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  views: number;
  ownerName: string;
}

export function VideoCard({ video }: { video: VideoCardData }) {
  // /home fetches the video list client-side via TanStack Query
  // (app/(home)/home/page.tsx) -- router.refresh() only re-runs Server
  // Component data, which this page no longer has, so it was a silent
  // no-op here: the rename/delete request succeeded but the visible grid
  // never picked it up. Invalidating the query is the actual refresh.
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [busy, setBusy] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/watch/${video.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
    setMenuOpen(false);
  }

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === video.title) {
      setTitle(video.title);
      setRenaming(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast.success("Title updated");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    } catch {
      toast.error("Could not rename video");
      setTitle(video.title);
    } finally {
      setBusy(false);
      setRenaming(false);
    }
  }

  async function deleteVideo() {
    setBusy(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Video deleted");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    } catch {
      toast.error("Could not delete video");
      setBusy(false);
    }
  }

  async function exportTo(provider: "drive" | "dropbox") {
    setMenuOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/videos/${video.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || "Export failed");
      toast.success(provider === "drive" ? "Saved to Google Drive" : "Saved to Dropbox");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group relative aspect-video overflow-hidden rounded-3xl bg-[#090b0c] transition-transform duration-300 hover:-translate-y-0.5">
      <Link href={`/watch/${video.id}`} className="absolute inset-0 block">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#1c1c1c,#090b0c)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
              <Icon icon="solar:play-linear" style={{ fontSize: "1.25rem" }} />
            </span>
          </div>
        )}
      </Link>

      {/* Bottom scrim -- same idea as the landing page's image cards
          (testimonials/SmartCards, analytics), text sits directly on the
          artwork instead of in a white panel below it. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-2/3 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {video.duration ? (
        <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full px-2.5 py-1 text-[0.75rem] font-normal tracking-tight text-white backdrop-blur-md" style={{ background: "rgba(0,0,0,.45)" }}>
          {formatDuration(video.duration)}
        </span>
      ) : null}

      <div className="absolute right-3 top-3 z-[3] opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white backdrop-blur-md transition-colors hover:bg-white/25"
          style={{ background: "rgba(255,255,255,.15)" }}
        >
          <Icon icon="solar:menu-dots-bold" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-50 mt-1 w-44 rounded-2xl border border-black/[.08] bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,.12)] backdrop-blur-xl">
              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.875rem] text-[#090b0c] hover:bg-black/[.04]"
              >
                <Icon icon="solar:link-linear" /> Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenaming(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.875rem] text-[#090b0c] hover:bg-black/[.04]"
              >
                <Icon icon="solar:pen-2-linear" /> Rename
              </button>
              <button
                type="button"
                onClick={() => exportTo("drive")}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.875rem] text-[#090b0c] hover:bg-black/[.04]"
              >
                <Icon icon="logos:google-drive" /> Save to Drive
              </button>
              <button
                type="button"
                onClick={() => exportTo("dropbox")}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.875rem] text-[#090b0c] hover:bg-black/[.04]"
              >
                <Icon icon="logos:dropbox" /> Save to Dropbox
              </button>
              <button
                type="button"
                onClick={deleteVideo}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.875rem] text-red-600 hover:bg-red-50"
              >
                <Icon icon="solar:trash-bin-trash-linear" /> Delete
              </button>
            </div>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[2] p-4">
        {renaming ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitle(video.title);
                setRenaming(false);
              }
            }}
            onBlur={saveTitle}
            autoFocus
            onClick={(e) => e.preventDefault()}
            className="w-full rounded-lg border border-white/25 bg-black/40 px-2 py-1 text-[0.9375rem] font-medium text-white outline-none backdrop-blur-md"
          />
        ) : (
          <Link href={`/watch/${video.id}`} className="block truncate text-[0.9375rem] font-medium text-white hover:underline">
            {video.title}
          </Link>
        )}
        <p className="mt-0.5 truncate text-[0.8125rem] text-white/60">
          {formatDate(video.createdAt)} · {video.views} {video.views === 1 ? "view" : "views"}
        </p>
      </div>
    </div>
  );
}
