"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Landing header. Floats transparently over the dark video hero (white logo),
 * then flips to a solid light bar with a black logo once the hero is scrolled
 * out from behind it — so the logo and nav stay legible against the light
 * sections below. Client component: needs the scroll position.
 */

const NAV = [
  { label: "Product", href: "#" },
  { label: "Features", href: "#analytics" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blogs" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Flip once the hero has (almost) fully scrolled past the fixed header,
    // i.e. when the light content behind the bar begins showing through.
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight - 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 border-b px-4 py-4 transition-colors duration-300 md:px-8 ${
        scrolled
          ? "border-black/[.06] bg-[#f5f5f2]/85 backdrop-blur-md"
          : "border-transparent"
      }`}
    >
      <div className="relative flex h-12 items-center">
        <a href="#hero" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="Screenbolt"
            width={613}
            height={93}
            className={`h-[22px] w-auto transition-[filter] duration-300 ${
              scrolled ? "brightness-0" : ""
            }`}
            priority
          />
        </a>

        <div
          className={`absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-md transition-colors duration-300 md:flex ${
            scrolled
              ? "border-black/[.08] bg-white/70"
              : "border-white/10 bg-[rgba(28,28,28,.75)]"
          }`}
        >
          {NAV.map((item) => {
            const className = `rounded-full px-4 py-2 text-[0.875rem] font-normal transition-colors ${
              scrolled
                ? "text-[#090b0c]/70 hover:bg-black/[.05] hover:text-[#090b0c]"
                : "text-white/80 hover:bg-white/10"
            }`;
            return item.href.startsWith("/") ? (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={className}>
                {item.label}
              </a>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <a
            href="/login"
            className={`hidden rounded-full px-4 py-2 text-[0.875rem] transition-colors sm:block ${
              scrolled
                ? "text-[#090b0c]/70 hover:text-[#090b0c]"
                : "text-white/80 hover:text-white"
            }`}
          >
            Login
          </a>
          <a
            href="/signup"
            className={`rounded-full px-5 py-2.5 text-[0.875rem] font-normal transition-colors ${
              scrolled
                ? "bg-[#090b0c] text-white hover:opacity-85"
                : "bg-white text-black hover:opacity-85"
            }`}
          >
            Start recording
          </a>
        </div>
      </div>
    </nav>
  );
}
