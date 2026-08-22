import { useQuery } from "@tanstack/react-query";

interface VideoListItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  views: number;
  user: { name: string | null; email: string | null } | null;
}

async function fetchVideos(): Promise<VideoListItem[]> {
  const res = await fetch("/api/videos");
  if (res.status === 400) {
    throw new Error("NO_ACTIVE_WORKSPACE");
  }
  if (!res.ok) throw new Error("Failed to load videos");
  const body = await res.json();
  return body.data.videos;
}

export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: fetchVideos,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
