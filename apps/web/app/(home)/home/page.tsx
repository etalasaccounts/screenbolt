"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

import { VideoCard } from "@/components/shell/video-card";
import { UploadButton } from "@/components/shell/upload-button";
import { useVideos } from "@/lib/hooks/use-videos";

export default function HomePage() {
  const router = useRouter();
  const { data: videos, isLoading, error } = useVideos();

  useEffect(() => {
    if (error instanceof Error && error.message === "NO_ACTIVE_WORKSPACE") {
      router.replace("/account");
    }
  }, [error, router]);

  if (isLoading || !videos) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon icon="solar:refresh-linear" className="animate-spin text-[#090b0c]/30" style={{ fontSize: "1.5rem" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-9 flex flex-col gap-6 border-b border-black/[.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-4 bg-[#090b0c]/40" />
            <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
              Library
            </p>
          </div>
          <h1 className="text-[2.25rem] font-normal leading-[0.98] tracking-tight text-[#090b0c] md:text-[2.75rem]">
            Your <span className="font-serif-italic">recordings</span>
          </h1>
          <p className="mt-2 text-[0.9375rem] text-[#090b0c]/50">
            {videos.length} {videos.length === 1 ? "recording" : "recordings"} in this workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UploadButton />
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-black/[.08] bg-white px-6 py-24 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/[.05]">
            <Icon icon="solar:clapperboard-linear" style={{ fontSize: "1.75rem" }} className="text-[#090b0c]/55" />
          </div>
          <h2 className="text-[1.5rem] font-normal tracking-tight text-[#090b0c]">
            No <span className="font-serif-italic">recordings</span> yet
          </h2>
          <p className="mt-2 max-w-sm text-[0.9375rem] leading-6 text-[#090b0c]/50">
            Record right here in your browser, use the Screenbolt extension, or upload a file — it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={{
                id: video.id,
                title: video.title,
                videoUrl: video.videoUrl,
                thumbnailUrl: video.thumbnailUrl,
                duration: video.duration,
                createdAt: video.createdAt,
                views: video.views,
                ownerName: video.user?.name ?? video.user?.email ?? "Unknown",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
