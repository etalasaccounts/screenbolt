"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Reveal } from "./reveal";

const FAQS = [
  {
    q: "Do viewers need an account to watch?",
    a: "No. Anyone with the link can watch instantly — no sign-up or download required.",
  },
  {
    q: "Can I edit after recording?",
    a: "Yes. Trim the start and end, add chapters, and remove filler words with AI — no editor needed.",
  },
  {
    q: "Is my data secure?",
    a: "Your recordings are private by default, encrypted in transit and at rest, and you control who can view them.",
  },
  {
    q: "What's included in the free plan?",
    a: "Up to 25 videos with screen and camera recording, instant sharing, and view counts with a time-saved estimate — free forever.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="overflow-hidden bg-[#f5f5f2] px-5 py-20 md:px-12">
      <div className="mx-auto grid max-w-[1280px] gap-16 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal y={30} duration={800}>
          <div className="mb-4 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
            QUESTIONS
          </div>
          <h2 className="text-[3.5rem] font-normal leading-none tracking-tight text-[#090b0c] md:text-[4.5rem]">
            Good to know.
          </h2>
        </Reveal>

        <Reveal y={30} delay={120} duration={800}>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <article key={item.q} className={`border-black/15 ${i === FAQS.length - 1 ? "border-y" : "border-t"}`}>
                <button
                  className="flex w-full items-center justify-between gap-4 py-7 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="text-[1.125rem] font-normal tracking-tight text-[#090b0c]">{item.q}</span>
                  <Icon
                    icon="solar:add-circle-linear"
                    className="shrink-0 transition-transform duration-300"
                    style={{
                      fontSize: "1.5rem",
                      color: "rgba(0,0,0,.7)",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{ maxHeight: isOpen ? "12rem" : "0px" }}
                >
                  <p className="max-w-xl pb-7 text-sm font-normal leading-6 text-[#090b0c]/50">{item.a}</p>
                </div>
              </article>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
