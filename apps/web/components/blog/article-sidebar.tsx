"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

export type ArticleHeading = { id: string; text: string };

/**
 * Right-rail sidebar for a blog post: a scroll-spied table of contents plus a
 * compact promo card. Desktop only (the page renders a collapsible TOC for
 * mobile). Client component — the scroll spy needs the DOM.
 */
export function ArticleSidebar({ headings }: { headings: ArticleHeading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      // Trigger when a heading crosses the upper band, just below the sticky header.
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="sticky top-20 flex flex-col gap-8">
      {headings.length > 0 && (
        <nav aria-label="Table of contents">
          <p className="mb-4 flex items-center gap-2 text-[0.6875rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
            <Icon icon="solar:list-check-linear" style={{ fontSize: "0.875rem" }} />
            On this page
          </p>
          <ul className="border-l border-black/[.08]">
            {headings.map((h) => {
              const active = h.id === activeId;
              return (
                <li key={h.id}>
                  <Link
                    href={`#${h.id}`}
                    aria-current={active ? "location" : undefined}
                    className={`-ml-px block border-l-2 py-1.5 pl-4 text-[0.8125rem] leading-snug transition-colors ${
                      active
                        ? "border-[#090b0c] font-medium text-[#090b0c]"
                        : "border-transparent text-[#090b0c]/55 hover:border-black/20 hover:text-[#090b0c]/85"
                    }`}
                  >
                    {h.text}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="rounded-3xl border border-black/[.08] bg-white/60 p-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#090b0c] text-white">
          <Icon icon="solar:videocamera-record-bold" style={{ fontSize: "1.125rem" }} />
        </span>
        <p className="mt-4 font-serif-italic text-[1.375rem] leading-[1.15] text-[#090b0c]">
          Record your screen in seconds.
        </p>
        <p className="mt-2 text-[0.8125rem] leading-[1.55] text-[#090b0c]/55">
          Free to start — no download, no credit card, no watermark.
        </p>
        <Link
          href="/signup"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#090b0c] py-2.5 text-[0.8125rem] font-normal text-white transition-opacity hover:opacity-85"
        >
          Start recording free
          <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: "0.875rem" }} />
        </Link>
      </div>
    </div>
  );
}
