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
  initialPinEnabled = false,
  initialPin = null,
}: {
  videoId: string;
  isOwner: boolean;
  initialIsPublic: boolean;
  initialPinEnabled?: boolean;
  initialPin?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pinEnabled, setPinEnabled] = useState(initialPinEnabled);
  const [pin, setPin] = useState<string | null>(initialPin);
  const [busy, setBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (open && dialogRef.current) dialogRef.current.focus();
  }, [open]);

  const getShareUrl = () => `${window.location.origin}/watch/${videoId}`;

  const getEmbedCode = () =>
    `<div style="position:relative;padding-top:56.25%">
  <iframe src="${window.location.origin}/embed/${videoId}" loading="lazy" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="fullscreen; autoplay; picture-in-picture" allowfullscreen title="Screenbolt recording"></iframe>
</div>`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  async function copyPin() {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      toast.success("PIN copied to clipboard");
    } catch {
      toast.error("Could not copy PIN");
    }
  }

  async function copyBoth() {
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(`${getShareUrl()}\nPIN: ${pin}`);
      toast.success("Link & PIN copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  }

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
      toast.success(newIsPublic ? "Recording is now searchable" : "Recording is no longer searchable");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not update privacy settings");
      setIsPublic(isPublic);
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePin() {
    const newEnabled = !pinEnabled;
    setPinBusy(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed");
      setPinEnabled(newEnabled);
      setPin(data.data?.pin ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update PIN");
    } finally {
      setPinBusy(false);
    }
  }

  async function handleRegeneratePin() {
    setPinBusy(true);
    try {
      // Disable then re-enable to get a fresh PIN
      await fetch(`/api/videos/${videoId}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const res = await fetch(`/api/videos/${videoId}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Failed");
      setPin(data.data?.pin ?? null);
      toast.success("New PIN generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate PIN");
    } finally {
      setPinBusy(false);
    }
  }

  function handleTextareaFocus() {
    if (textareaRef.current) textareaRef.current.select();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/[.12] bg-white px-4 text-[0.875rem] transition-colors hover:bg-black/[.04]"
      >
        <Icon icon="solar:share-linear" style={{ fontSize: "0.9375rem" }} />
        Share
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" />
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
                  <Icon icon="solar:close-circle-linear" style={{ fontSize: "1.25rem" }} />
                </button>
              </div>

              {/* Copy link + PIN buttons */}
              <div className="mb-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex w-full items-center gap-2 rounded-xl border border-black/[.08] bg-black/[.02] px-4 py-3 text-left text-[0.8125rem] transition-colors hover:bg-black/[.04]"
                >
                  <Icon icon="solar:copy-linear" style={{ fontSize: "1rem" }} className="shrink-0 text-[#090b0c]/50" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[#090b0c]/70">{getShareUrl()}</div>
                  </div>
                  <span className="shrink-0 text-[0.75rem] font-medium text-[#090b0c]/50">Copy link</span>
                </button>
                {pinEnabled && pin && (
                  <>
                    <button
                      type="button"
                      onClick={copyPin}
                      className="flex w-full items-center gap-2 rounded-xl border border-black/[.08] bg-black/[.02] px-4 py-3 text-[0.8125rem] transition-colors hover:bg-black/[.04]"
                    >
                      <Icon icon="solar:lock-linear" style={{ fontSize: "1rem" }} className="shrink-0 text-[#090b0c]/50" />
                      <span className="font-mono font-medium tracking-[0.1em] text-[#090b0c]/70">{pin}</span>
                      <div className="flex-1" />
                      <span className="shrink-0 text-[0.75rem] font-medium text-[#090b0c]/50">Copy PIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyBoth}
                      className="self-center text-[0.75rem] text-[#090b0c]/40 underline-offset-2 hover:text-[#090b0c]/60 hover:underline"
                    >
                      Copy link &amp; PIN
                    </button>
                  </>
                )}
              </div>

              {/* Owner-only controls */}
              {isOwner && (
                <div className="space-y-0 divide-y divide-black/[.06] border-t border-black/[.08] pt-4">
                  {/* PIN protection toggle */}
                  <div className="pb-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <div className="relative mt-0.5 flex-none">
                        <input
                          type="checkbox"
                          checked={pinEnabled}
                          onChange={handleTogglePin}
                          disabled={pinBusy}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-[0.875rem] font-medium text-[#090b0c]">
                          Protect with PIN
                        </div>
                        <div className="text-[0.75rem] text-[#090b0c]/55">
                          Viewers must enter a PIN to watch. Share the PIN along with the link.
                        </div>
                        {pinEnabled && pin && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-lg bg-[#090b0c] px-3 py-1 font-mono text-[1rem] font-medium tracking-[0.2em] text-white">
                              {pin}
                            </span>
                            <button
                              type="button"
                              onClick={handleRegeneratePin}
                              disabled={pinBusy}
                              className="flex items-center gap-1 rounded-full border border-black/[.10] px-2.5 py-1 text-[0.75rem] text-[#090b0c]/60 transition-colors hover:bg-black/[.04] disabled:opacity-50"
                            >
                              <Icon icon="solar:refresh-linear" style={{ fontSize: "0.875rem" }} />
                              New PIN
                            </button>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Search engine indexing */}
                  <div className={`pt-4 ${pinEnabled ? "pointer-events-none opacity-40" : ""}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pinEnabled ? false : isPublic}
                        onChange={handleTogglePublic}
                        disabled={busy || pinEnabled}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="text-[0.875rem] font-medium text-[#090b0c]">
                          Allow search engines to index this video
                        </div>
                        <div className="text-[0.75rem] text-[#090b0c]/55">
                          {pinEnabled ? "Disabled when PIN protection is on." : "Off by default. Your link keeps working either way."}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Embed section */}
              <div className={`mt-4 border-t border-black/[.08] pt-4 ${pinEnabled ? "pointer-events-none opacity-40" : ""}`}>
                <label className="block text-[0.8125rem] font-medium mb-2 text-[#090b0c]/70">
                  Embed on your website
                </label>
                {pinEnabled ? (
                  <p className="text-[0.75rem] text-[#090b0c]/55">Embed is disabled when PIN protection is on.</p>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
