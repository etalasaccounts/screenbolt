"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { captureThumbnail } from "@/lib/client/capture-thumbnail";
import { uploadVideo } from "@/lib/client/chunked-upload";

export function UploadButton() {
  // See the matching comment in video-card.tsx -- router.refresh() is a
  // no-op against /home's TanStack Query data.
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/") && !file.name.match(/\.(webm|mp4|mov|mkv|avi)$/i)) {
      toast.error("Please choose a video file");
      return;
    }

    setUploading(true);
    setStatus("Uploading… 0%");
    try {
      const objectUrl = URL.createObjectURL(file);
      const thumbnailBlob = await captureThumbnail(objectUrl);
      URL.revokeObjectURL(objectUrl);

      await uploadVideo(file, {
        thumbnail: thumbnailBlob,
        onProgress: ({ percent, phase }) =>
          setStatus(phase === "finishing" ? "Finishing…" : `Uploading… ${percent}%`),
      });
      toast.success("Video uploaded");
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setStatus(null);
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
        {uploading ? (status ?? "Uploading…") : "Upload a video"}
      </button>
    </>
  );
}
