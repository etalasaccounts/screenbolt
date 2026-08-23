import type { MetadataRoute } from "next";

import { VideoService } from "@/lib/services/video.service";

// Includes public videos from the DB, so re-check for newly-published ones hourly
// instead of only at build/deploy time.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicVideos = await VideoService.listPublicVideos();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://screenbolt.app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://screenbolt.app/privacy",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: "https://screenbolt.app/terms",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  const videoEntries: MetadataRoute.Sitemap = publicVideos.map((video) => ({
    url: `https://screenbolt.app/watch/${video.id}`,
    lastModified: video.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...videoEntries];
}
