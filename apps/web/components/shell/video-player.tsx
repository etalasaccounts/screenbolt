"use client";

export function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title: string;
}) {
  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-[#090b0c] text-center text-white/60">
        <p className="px-6 text-sm">This video is still processing or no longer available.</p>
      </div>
    );
  }

  return (
    <video
      className="aspect-video w-full rounded-2xl bg-black object-contain"
      src={src}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      title={title}
    />
  );
}
