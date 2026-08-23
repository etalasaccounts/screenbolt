"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { ApiClientError, apiPut } from "@/lib/client/api-fetch";

export function PublicToggle({
  videoId,
  initialIsPublic,
}: {
  videoId: string;
  initialIsPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [busy, setBusy] = useState(false);

  async function togglePublic() {
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

  return (
    <button
      type="button"
      onClick={togglePublic}
      disabled={busy}
      title={isPublic ? "Make not searchable" : "Make searchable"}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[0.875rem] transition-colors ${
        isPublic
          ? "border-black/[.12] bg-black/[.04] text-[#090b0c] hover:bg-black/[.08]"
          : "border-black/[.12] bg-white hover:bg-black/[.04]"
      }`}
    >
      <Icon
        icon={isPublic ? "solar:global-linear" : "solar:lock-linear"}
        style={{ fontSize: "0.9375rem" }}
      />
      {isPublic ? "Searchable" : "Not searchable"}
    </button>
  );
}
