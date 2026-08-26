import type { MetadataRoute } from "next";

import { VideoService } from "@/lib/services/video.service";
import { listBlogPosts } from "@/lib/blog/blog";

// Includes public videos from the DB, so re-check for newly-published ones hourly
// instead of only at build/deploy time.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicVideos = await VideoService.listPublicVideos();
  const blogPosts = listBlogPosts();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://screenbolt.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://screenbolt.com/blogs",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://screenbolt.com/privacy",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: "https://screenbolt.com/terms",
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `https://screenbolt.com/blogs/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const videoEntries: MetadataRoute.Sitemap = publicVideos.map((video) => ({
    url: `https://screenbolt.com/watch/${video.id}`,
    lastModified: video.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries, ...videoEntries];
}
