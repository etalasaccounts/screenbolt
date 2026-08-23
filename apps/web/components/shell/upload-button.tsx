"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { captureThumbnail } from "@/lib/client/capture-thumbnail";
import { apiFetchRaw } from "@/lib/client/api-fetch";

export function UploadButton() {
  // See the matching comment in video-card.tsx -- router.refresh() is a
  // no-op against /home's TanStack Query data.
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/") && !file.name.match(/\.(webm|mp4|mov|mkv|avi)$/i)) {
      toast.error("Please choose a video file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", file);

      const objectUrl = URL.createObjectURL(file);
      const thumbnailBlob = await captureThumbnail(objectUrl);
      URL.revokeObjectURL(objectUrl);
      if (thumbnailBlob) {
        formData.append("thumbnail", new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" }));
      }

      await apiFetchRaw('/api/upload', { method: 'POST', body: formData });
      toast.success("Video uploaded");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.webm,.mp4,.mov,.mkv,.avi"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-10 items-center gap-1.5 rounded-full border border-black/[.14] bg-white px-5 text-[0.875rem] text-[#090b0c] transition-colors hover:bg-black/[.04] disabled:opacity-50"
      >
        <Icon icon="solar:upload-linear" style={{ fontSize: "0.9375rem" }} />
        {uploading ? "Uploading…" : "Upload a video"}
      </button>
    </>
  );
}
