import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f2] text-[#090b0c]">
      <header className="flex justify-center px-6 pt-10">
        <Link href="/">
          <Image src="/logo.svg" alt="Screenbolt" width={613} height={93} className="h-[22px] w-auto brightness-0" priority />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">{children}</main>
      <footer className="px-6 pb-8 text-center text-xs text-[#090b0c]/40">
        © {new Date().getFullYear()} Screenbolt ·{" "}
        <a href="/terms" className="underline underline-offset-2">Terms</a> ·{" "}
        <a href="/privacy" className="underline underline-offset-2">Privacy</a>
      </footer>
    </div>
  );
}
