import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";

import { PublicHeader } from "@/components/shell/public-header";
import { Footer } from "@/components/landing/footer";
import { Reveal } from "@/components/landing/reveal";
import { listBlogPosts } from "@/lib/blog/blog";

export const metadata: Metadata = {
  title: "Blog — Screen Recording Guides & Tips",
  description:
    "Guides, tips, and product notes on screen recording, async communication, and sharing HD video with your team — from the people building Screenbolt.",
  alternates: {
    canonical: "https://screenbolt.com/blogs",
  },
  openGraph: {
    type: "website",
    title: "Screenbolt Blog — Screen Recording Guides & Tips",
    description:
      "Guides, tips, and product notes on screen recording, async communication, and sharing HD video with your team.",
    url: "https://screenbolt.com/blogs",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogsPage() {
  const posts = listBlogPosts();
  const [featured, ...rest] = posts;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Screenbolt Blog",
    url: "https://screenbolt.com/blogs",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `https://screenbolt.com/blogs/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
    })),
  };

  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#090b0c]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader />

      <main>
        <section className="overflow-hidden px-5 pb-16 pt-16 md:px-12 md:pt-24">
          <div className="mx-auto max-w-[1280px]">
            <Reveal y={30} duration={800}>
              <p className="mb-4 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
                BLOG
              </p>
              <h1 className="max-w-3xl text-[3.5rem] font-normal leading-[0.95] tracking-tight text-[#090b0c] md:text-[5rem]">
                Guides for a <span className="font-serif-italic">faster</span> way to communicate.
              </h1>
              <p className="mt-6 max-w-xl text-[1.0625rem] font-normal leading-[1.6] text-[#090b0c]/60">
                Recording, sharing, and getting your team out of long threads —
                notes from the people building Screenbolt.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="overflow-hidden px-5 pb-24 md:px-12">
          <div className="mx-auto max-w-[1280px]">
            {featured && (
              <Reveal y={40} duration={800} className="mb-6 block">
                <Link
                  href={`/blogs/${featured.slug}`}
                  className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl"
                >
                  <Image
                    src={featured.coverImage}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 1280px"
                    className="absolute inset-0 z-0 object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative z-[2] flex flex-col gap-4 p-8 md:p-12">
                    <span className="w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[0.6875rem] font-normal uppercase tracking-[0.1rem] text-white backdrop-blur-md">
                      {featured.category}
                    </span>
                    <h2 className="max-w-2xl text-[2rem] font-normal leading-[1.05] tracking-tight text-white md:text-[2.75rem]">
                      {featured.title}
                    </h2>
                    <p className="max-w-xl text-[0.9375rem] leading-[1.6] text-white/70">
                      {featured.excerpt}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[0.8125rem] font-normal text-white/60">
                      <span>{formatDate(featured.publishedAt)}</span>
                      <span>·</span>
                      <span>{featured.readingTime} min read</span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <Reveal key={post.slug} y={30} delay={i * 80} duration={700}>
                  <Link
                    href={`/blogs/${post.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/[.06] bg-white/60"
                  >
                    <div className="relative h-52 w-full overflow-hidden">
                      <Image
                        src={post.coverImage}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="absolute inset-0 z-0 object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute left-4 top-4 z-[1]">
                        <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1 text-[0.6875rem] font-normal uppercase tracking-[0.1rem] text-white backdrop-blur-md">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-[1.25rem] font-normal leading-[1.2] tracking-tight text-[#090b0c]">
                        {post.title}
                      </h3>
                      <p className="mt-3 flex-1 text-[0.875rem] leading-[1.6] text-[#090b0c]/55">
                        {post.excerpt}
                      </p>
                      <div className="mt-6 flex items-center justify-between">
                        <span className="text-[0.75rem] font-normal text-[#090b0c]/40">
                          {formatDate(post.publishedAt)} · {post.readingTime} min
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#090b0c] text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                          <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: ".75rem" }} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
