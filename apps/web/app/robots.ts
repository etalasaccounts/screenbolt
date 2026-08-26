import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/d", "/d/*", "/api", "/api/*"],
      },
    ],
    sitemap: "https://screenbolt.com/sitemap.xml",
  };
}
