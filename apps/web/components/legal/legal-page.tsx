import Link from "next/link";

import type { LegalSection } from "./privacy-content";

export function LegalPage({
  title,
  lastUpdated,
  sections,
  related,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  related: { href: string; label: string };
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f2] text-[#090b0c]">
      <header className="border-b border-black/[.06]">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="text-[1.125rem] font-semibold tracking-tight">
            Screenbolt
          </Link>
          <span className="ml-4 text-sm text-[#090b0c]/40">{title}</span>
          <Link
            href="/"
            className="ml-auto text-[0.875rem] text-[#090b0c]/60 transition-colors hover:text-[#090b0c]"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-[2.25rem] font-normal leading-tight tracking-tight">{title}</h1>
        <p className="mt-2 text-[0.875rem] text-[#090b0c]/45">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-xl font-medium tracking-tight">{section.heading}</h2>
              {section.blocks.map((block, i) => {
                if (block.kind === "h3") {
                  return (
                    <h3 key={i} className="mb-2 mt-5 text-base font-medium text-[#090b0c]/80">
                      {block.text}
                    </h3>
                  );
                }
                if (block.kind === "list") {
                  return (
                    <ul key={i} className="mb-3 list-disc space-y-1.5 pl-6 text-[0.9375rem] leading-relaxed text-[#090b0c]/70">
                      {block.items?.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  );
                }
                return (
                  <p key={i} className="mb-3 text-[0.9375rem] leading-relaxed text-[#090b0c]/70">
                    {block.text}
                  </p>
                );
              })}
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-black/[.08] pt-8">
          <a
            href={related.href}
            className="text-[0.9375rem] font-medium underline underline-offset-2"
          >
            {related.label} →
          </a>
        </div>
      </main>
    </div>
  );
}
