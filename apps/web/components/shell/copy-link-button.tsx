"use client";

import { toast } from "sonner";
import { Icon } from "@iconify/react";

export function CopyLinkButton({ videoId }: { videoId: string }) {
  async function copy() {
    const url = `${window.location.origin}/watch/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[.12] bg-white px-4 text-[0.875rem] transition-colors hover:bg-black/[.04]"
    >
      <Icon icon="solar:link-linear" style={{ fontSize: "0.9375rem" }} />
      Copy link
    </button>
  );
}
