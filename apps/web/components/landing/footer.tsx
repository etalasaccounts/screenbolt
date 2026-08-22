import Image from "next/image";

const EXPLORE = [
  { href: "#how", label: "How it works" },
  { href: "#analytics", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

const COMPANY = [
  { href: "#", label: "About" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Careers" },
  { href: "#", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="overflow-hidden bg-[#f5f5f2] px-6 pb-6 pt-20 text-[#090b0c]">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-14 border-b border-black/15 pb-16 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <a href="#" className="flex items-center">
              <Image src="/logo.svg" alt="Screenbolt" width={100} height={22} className="h-[22px] w-auto brightness-0" />
            </a>
            <p className="mt-6 max-w-sm text-[1.375rem] font-normal leading-snug tracking-tight text-[#090b0c]">
              The fastest way to record your screen and share it with anyone.
            </p>
          </div>
          <div>
            <p className="mb-5 text-xs font-normal uppercase tracking-[0.15rem] text-[#090b0c]/35">Explore</p>
            <div className="space-y-3 text-sm font-normal text-[#090b0c]/70">
              {EXPLORE.map((link) => (
                <a key={link.label} href={link.href} className="block hover:text-[#090b0c]">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-5 text-xs font-normal uppercase tracking-[0.15rem] text-[#090b0c]/35">Company</p>
            <div className="space-y-3 text-sm font-normal text-[#090b0c]/70">
              {COMPANY.map((link) => (
                <a key={link.label} href={link.href} className="block hover:text-[#090b0c]">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-6 text-xs font-normal uppercase tracking-wider text-[#090b0c]/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Screenbolt</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#090b0c]">Privacy</a>
            <a href="#" className="hover:text-[#090b0c]">Terms</a>
          </div>
        </div>
      </div>

      <p className="mt-4 select-none whitespace-nowrap bg-gradient-to-b from-[#090b0c] to-[#090b0c]/0 bg-clip-text text-center text-[16vw] font-medium leading-none tracking-[-0.04em] text-transparent">
        SCREENBOLT
      </p>
    </footer>
  );
}
