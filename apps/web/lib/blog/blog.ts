import postsData from "./posts.json";

export type BlogContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: number;
  author: { name: string; role: string };
  seo: { title: string; description: string; keywords: string[] };
  content: BlogContentBlock[];
};

const allPosts = (postsData as { posts: BlogPost[] }).posts;

/** Newest first, by publishedAt. */
export function listBlogPosts(): BlogPost[] {
  return [...allPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return allPosts.find((post) => post.slug === slug);
}

export function listBlogSlugs(): string[] {
  return allPosts.map((post) => post.slug);
}
