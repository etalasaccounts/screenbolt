"use client";

import { toast } from "sonner";
import { Icon } from "@iconify/react";

export function EmbedButton({ videoId }: { videoId: string }) {
  async function copy() {
    // responsive iframe wrapper with 56.25% padding-top (16:9 aspect ratio).
    // Without this padding-top wrapper, the iframe would be fixed-height
    // and break responsiveness on mobile. The padding-top trick creates an
    // intrinsic aspect ratio container that scales with viewport width.
    const embedCode = `<div style="position:relative;padding-top:56.25%">
  <iframe src="${window.location.origin}/embed/${videoId}" loading="lazy" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="fullscreen; autoplay; picture-in-picture" allowfullscreen title="Screenbolt recording"></iframe>
</div>`;

    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success("Embed code copied to clipboard");
    } catch {
      toast.error("Could not copy embed code");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[.12] bg-white px-4 text-[0.875rem] transition-colors hover:bg-black/[.04]"
    >
      <Icon icon="solar:code-square-linear" style={{ fontSize: "0.9375rem" }} />
      Embed
    </button>
  );
}
