import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { VideoService } from "@/lib/services/video.service";

// Deduplicate VideoService.getVideo() calls within a single render (both
// generateMetadata and the page component call it). React's cache() ensures
// the second call reuses the first's result instead of hitting the DB twice.
const getVideoCached = cache((id: string) => VideoService.getVideo(id));

function renderPlayer({
  videoUrl,
  thumbnailUrl,
  title,
  autoplay,
  muted,
  loop,
  startTime,
}: {
  videoUrl: string;
  thumbnailUrl: string | null;
  title: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  startTime: number | null;
}) {
  if (!videoUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-center text-white/60">
        <p className="px-6 text-sm">This video is still processing or no longer available.</p>
      </div>
    );
  }

  // Append media fragment for start time if present
  let src = videoUrl;
  if (startTime !== null) {
    src = `${videoUrl}#t=${startTime}`;
  }

  return (
    <video
      className="h-full w-full object-contain"
      src={src}
      poster={thumbnailUrl ?? undefined}
      controls
      playsInline
      preload="metadata"
      title={title}
      autoPlay={autoplay}
      muted={muted}
      loop={loop}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoCached(id);

  return {
    title: video?.title ?? "Recording",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const queryParams = await searchParams;

  const video = await getVideoCached(id);
  if (!video) {
    notFound();
  }

  // Parse query parameters
  const getParam = (param: string | string[] | undefined): string => {
    if (Array.isArray(param)) {
      return param[0] ?? "";
    }
    return param ?? "";
  };

  const autoplayParam = getParam(queryParams.autoplay);
  const mutedParam = getParam(queryParams.muted);
  const loopParam = getParam(queryParams.loop);
  const timeParam = getParam(queryParams.t);

  // Treat "1" and "true" as ON
  const autoplay = autoplayParam === "1" || autoplayParam === "true";
  const muted = mutedParam === "1" || mutedParam === "true" || autoplay; // Force muted when autoplay is on (browser requirement)
  const loop = loopParam === "1" || loopParam === "true";

  // Parse start time
  let startTime: number | null = null;
  if (timeParam) {
    const parsed = Number(timeParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      startTime = parsed;
    }
  }

  return (
    <div className="fixed inset-0 bg-black">
      {renderPlayer({
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        title: video.title,
        autoplay,
        muted,
        loop,
        startTime,
      })}
    </div>
  );
}
