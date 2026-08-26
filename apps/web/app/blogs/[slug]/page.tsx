import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@iconify/react";

import { SiteHeader } from "@/components/shell/site-header";
import { Footer } from "@/components/landing/footer";
import { Reveal } from "@/components/landing/reveal";
import { ArticleSidebar } from "@/components/blog/article-sidebar";
import { getBlogPost, listBlogPosts, listBlogSlugs, type BlogContentBlock } from "@/lib/blog/blog";

/** Stable anchor id from a heading's text — shared by the headings and the TOC. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return listBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const url = `https://screenbolt.com/blogs/${post.slug}`;

  return {
    title: post.seo.title,
    description: post.seo.description,
    keywords: post.seo.keywords,
    authors: [{ name: post.author.name }],
    category: post.category,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      title: post.seo.title,
      description: post.seo.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [
        {
          url: post.ogImage,
          width: 1536,
          height: 1024,
          alt: post.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo.title,
      description: post.seo.description,
      images: [post.ogImage],
    },
  };
}

/** Renders inline markdown-style links ([label](href)) inside body text.
 *  Internal paths use next/link; external URLs open safely in a new tab. */
function renderRichText(text: string): React.ReactNode[] {
  const linkClass =
    "font-medium text-[#090b0c] underline decoration-[#090b0c]/30 underline-offset-2 transition-colors hover:decoration-[#090b0c]";
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [, label, href] = match;
    if (href.startsWith("/")) {
      nodes.push(
        <Link key={key++} href={href} className={linkClass}>
          {label}
        </Link>
      );
    } else {
      nodes.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {label}
        </a>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ContentBlock({ block }: { block: BlogContentBlock }) {
  if (block.type === "heading") {
    return (
      <h2
        id={slugify(block.text)}
        className="mb-4 mt-14 scroll-mt-24 text-[1.75rem] font-normal leading-[1.15] tracking-tight text-[#090b0c]"
      >
        {block.text}
      </h2>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="mb-6 space-y-3 pl-1">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3 text-[1.0625rem] leading-[1.75] text-[#090b0c]/75">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#090b0c]/30" />
            <span>{renderRichText(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="my-10 border-l-2 border-[#090b0c]/20 pl-6">
        <p className="font-serif-italic text-[1.5rem] leading-[1.4] text-[#090b0c]">
          {renderRichText(block.text)}
        </p>
      </blockquote>
    );
  }
  return (
    <p className="mb-6 text-[1.0625rem] leading-[1.8] text-[#090b0c]/75">
      {renderRichText(block.text)}
    </p>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = listBlogPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  const headings = post.content.flatMap((block) =>
    block.type === "heading" ? [{ id: slugify(block.text), text: block.text }] : []
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo.description,
    image: [`https://screenbolt.com${post.ogImage}`, `https://screenbolt.com${post.coverImage}`],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    keywords: post.seo.keywords.join(", "),
    articleSection: post.category,
    author: { "@type": "Organization", name: post.author.name, url: "https://screenbolt.com" },
    publisher: {
      "@type": "Organization",
      name: "Screenbolt",
      logo: { "@type": "ImageObject", url: "https://screenbolt.com/logo.svg" },
    },
    mainEntityOfPage: `https://screenbolt.com/blogs/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#090b0c]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <main>
        <div className="mx-auto max-w-[1060px] px-5 pb-16 pt-14 md:px-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_248px] lg:gap-x-14">
            <article className="min-w-0">
              <Link
                href="/blogs"
                className="mb-8 inline-flex items-center gap-1.5 text-[0.875rem] font-normal text-[#090b0c]/50 transition-colors hover:text-[#090b0c]"
              >
                <Icon icon="solar:arrow-left-linear" style={{ fontSize: "1rem" }} />
                Back to blog
              </Link>

              <Reveal y={20} duration={700}>
                <header>
                  <span className="mb-5 inline-block rounded-full border border-black/[.10] px-3 py-1 text-[0.6875rem] font-normal uppercase tracking-[0.1rem] text-[#090b0c]/60">
                    {post.category}
                  </span>
                  <h1 className="text-[2.25rem] font-normal leading-[1.08] tracking-tight text-[#090b0c] md:text-[3.25rem]">
                    {post.title}
                  </h1>
                  <p className="mt-5 text-[1.125rem] leading-[1.6] text-[#090b0c]/55">
                    {post.excerpt}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3 border-y border-black/[.08] py-5 text-[0.875rem] text-[#090b0c]/50">
                    <address className="not-italic font-normal text-[#090b0c]/80">
                      {post.author.name}
                    </address>
                    <span>·</span>
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    <span>·</span>
                    <span>{post.readingTime} min read</span>
                  </div>
                </header>
              </Reveal>

              <Reveal y={30} delay={100} duration={800} className="mt-10 block">
                <figure className="relative h-[240px] w-full overflow-hidden rounded-3xl sm:h-[320px] lg:h-[380px]">
                  <Image
                    src={post.coverImage}
                    alt={post.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 720px"
                    className="object-cover"
                    priority
                  />
                </figure>
              </Reveal>

              {headings.length > 0 && (
                <details className="group mt-10 rounded-2xl border border-black/[.08] bg-white/60 lg:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3.5 text-[0.8125rem] font-medium text-[#090b0c] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <Icon icon="solar:list-check-linear" style={{ fontSize: "1rem" }} />
                      On this page
                    </span>
                    <Icon
                      icon="solar:alt-arrow-down-linear"
                      className="transition-transform group-open:rotate-180"
                      style={{ fontSize: "1rem" }}
                    />
                  </summary>
                  <ul className="border-t border-black/[.06] px-3 pb-3 pt-2">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          className="block rounded-lg px-2 py-1.5 text-[0.8125rem] leading-snug text-[#090b0c]/60 transition-colors hover:bg-black/[.04] hover:text-[#090b0c]"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="mt-12">
                {post.content.map((block, i) => (
                  <ContentBlock key={i} block={block} />
                ))}

                <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl border border-black/[.08] bg-white/60 p-8">
                  <p className="font-serif-italic text-[1.5rem] leading-[1.2] text-[#090b0c]">
                    Stop typing. Start recording.
                  </p>
                  <p className="text-[0.9375rem] leading-[1.6] text-[#090b0c]/60">
                    Screenbolt is free to start — no download, no credit card.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-1 flex items-center gap-2 rounded-full bg-[#090b0c] py-2 pl-6 pr-2 text-[0.9375rem] font-normal text-white transition-opacity hover:opacity-85"
                  >
                    Start recording free
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#090b0c]">
                      <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: "1rem" }} />
                    </span>
                  </Link>
                </div>
              </div>
            </article>

            <aside className="hidden pt-2 lg:block">
              <ArticleSidebar headings={headings} />
            </aside>
          </div>
        </div>

        {related.length > 0 && (
          <section className="border-t border-black/[.08] px-5 py-16 md:px-12">
            <div className="mx-auto max-w-[1280px]">
              <p className="mb-8 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
                MORE FROM THE BLOG
              </p>
              <div className="grid gap-6 md:grid-cols-3">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blogs/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-black/[.06] bg-white/60"
                  >
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={p.coverImage}
                        alt={p.imageAlt}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="absolute inset-0 z-0 object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-[1rem] font-normal leading-[1.3] tracking-tight text-[#090b0c]">
                        {p.title}
                      </h3>
                      <span className="mt-3 block text-[0.75rem] text-[#090b0c]/40">
                        {p.readingTime} min read
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
