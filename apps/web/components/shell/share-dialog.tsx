"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { ApiClientError, apiPut } from "@/lib/client/api-fetch";

export function ShareDialog({
  videoId,
  isOwner,
  initialIsPublic,
}: {
  videoId: string;
  isOwner: boolean;
  initialIsPublic: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close dialog on Escape
  useEffect(() => {
    if (!open) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  // Focus management when dialog opens
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  const getEmbedCode = () => {
    // responsive iframe wrapper with 56.25% padding-top (16:9 aspect ratio).
    // Without this padding-top wrapper, the iframe would be fixed-height
    // and break responsiveness on mobile. The padding-top trick creates an
    // intrinsic aspect ratio container that scales with viewport width.
    return `<div style="position:relative;padding-top:56.25%">
  <iframe src="${window.location.origin}/embed/${videoId}" loading="lazy" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="fullscreen; autoplay; picture-in-picture" allowfullscreen title="Screenbolt recording"></iframe>
</div>`;
  };

  async function copyEmbedCode() {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      toast.success("Embed code copied to clipboard");
    } catch {
      toast.error("Could not copy embed code");
    }
  }

  async function handleTogglePublic() {
    const newIsPublic = !isPublic;
    setBusy(true);
    try {
      await apiPut(`/api/videos/${videoId}`, { isPublic: newIsPublic });
      setIsPublic(newIsPublic);
      toast.success(
        newIsPublic ? "Recording is now searchable" : "Recording is no longer searchable"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not update privacy settings");
      setIsPublic(isPublic);
    } finally {
      setBusy(false);
    }
  }

  function handleTextareaFocus() {
    if (textareaRef.current) {
      textareaRef.current.select();
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[.12] bg-white px-4 text-[0.875rem] transition-colors hover:bg-black/[.04]"
      >
        <Icon icon="solar:share-linear" style={{ fontSize: "0.9375rem" }} />
        Share
      </button>

      {/* Dialog overlay */}
      {open && (
        <>
          {/* Backdrop (visual scrim, sibling beneath wrapper) */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
          />

          {/* Dialog wrapper: receives click-outside-to-close because it's a full-screen layer above the backdrop sibling.
              The scrim is a z-40 sibling underneath, not an ancestor, so click handlers must live here on the z-50 wrapper. */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Share"
              tabIndex={-1}
              className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-black/[.08] bg-white/95 shadow-[0_12px_40px_rgba(0,0,0,.12)] backdrop-blur-xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[0.875rem] font-medium">Share</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#090b0c]/70 transition-colors hover:bg-black/[.05]"
                  aria-label="Close"
                >
                  <Icon
                    icon="solar:close-circle-linear"
                    style={{ fontSize: "1.25rem" }}
                  />
                </button>
              </div>

              {/* Access line */}
              <div className="mb-5 flex items-center gap-2 text-[0.8125rem] text-[#090b0c]/55">
                <Icon
                  icon="solar:global-linear"
                  style={{ fontSize: "1rem" }}
                />
                <span>Anyone with this link can watch</span>
              </div>

              {/* Embed section */}
              <div className="mb-4">
                <label className="block text-[0.875rem] font-medium mb-2">
                  Embed on your website
                </label>
                <textarea
                  ref={textareaRef}
                  rows={3}
                  readOnly
                  value={getEmbedCode()}
                  onFocus={handleTextareaFocus}
                  className="w-full rounded-xl border border-black/[.08] bg-black/[.02] p-3 font-mono text-[0.75rem] resize-none focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyEmbedCode}
                  className="mt-2 flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[.12] bg-white px-4 text-[0.875rem] transition-colors hover:bg-black/[.04]"
                >
                  <Icon icon="solar:copy-linear" style={{ fontSize: "0.9375rem" }} />
                  Copy code
                </button>
              </div>

              {/* Search engine setting (owner only) */}
              {isOwner && (
                <div className="border-t border-black/[.08] pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={handleTogglePublic}
                      disabled={busy}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="text-[0.875rem] font-medium text-[#090b0c]">
                        Allow search engines to index this video
                      </div>
                      <div className="text-[0.75rem] text-[#090b0c]/55">
                        Off by default. Your link keeps working either way.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
