import Image from "next/image";
import Link from "next/link";

/**
 * Public header for anonymous viewers on /watch/[id].
 * Server component — ships zero client JS.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-black/[.06] bg-[#f5f5f2]/85 px-4 backdrop-blur-md md:px-8">
      <Link href="/" className="flex items-center">
        <Image
          src="/logo.svg"
          alt="Screenbolt"
          width={613}
          height={93}
          className="h-[21px] w-auto brightness-0"
          priority
        />
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[0.875rem] text-[#090b0c]/70 transition-colors hover:text-[#090b0c]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="flex h-9 items-center justify-center rounded-full bg-[#090b0c] px-4 text-[0.875rem] text-white transition-opacity hover:opacity-85"
        >
          Sign up free
        </Link>
      </div>
    </header>
  );
}
