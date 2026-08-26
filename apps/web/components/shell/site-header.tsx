import Image from "next/image";
import Link from "next/link";

/**
 * Public marketing header — mirrors the landing hero's pill nav, tuned for the
 * light pages (blog, etc.) instead of the dark video hero. Server component,
 * zero client JS. Inner content is capped to the site container width so the
 * logo and actions align with page content.
 */

const NAV = [
  { label: "Product", href: "/" },
  { label: "Features", href: "/#analytics" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Blog", href: "/blogs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[.06] bg-[#f5f5f2]/85 px-4 py-4 backdrop-blur-md md:px-8">
      <div className="relative mx-auto flex h-12 max-w-[1280px] items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="Screenbolt"
            width={613}
            height={93}
            className="h-[22px] w-auto brightness-0"
            priority
          />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-black/[.08] bg-white/70 px-2 py-1.5 backdrop-blur-md md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-[0.875rem] font-normal text-[#090b0c]/70 transition-colors hover:bg-black/[.05] hover:text-[#090b0c]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-[0.875rem] text-[#090b0c]/70 transition-colors hover:text-[#090b0c] sm:block"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#090b0c] px-5 py-2.5 text-[0.875rem] font-normal text-white transition-opacity hover:opacity-85"
          >
            Start recording
          </Link>
        </div>
      </div>
    </header>
  );
}
