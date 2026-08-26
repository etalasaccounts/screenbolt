import Image from "next/image";
import { Icon } from "@iconify/react";
import { Reveal } from "./reveal";

export function Cta() {
  return (
    <section
      id="cta"
      className="relative mx-auto mb-10 w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/[.12] px-5 py-24 text-center md:px-12 md:py-32"
    >
      <Image src="/artwork-landscape.webp" alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="absolute inset-0 z-0 object-cover" />
      <div className="absolute inset-0 z-[1] bg-black/[.42]" />
      <Reveal y={30} blur={12} duration={800} className="relative z-[2] mx-auto flex max-w-3xl flex-col items-center">
        <p className="mb-5 text-xs font-normal uppercase tracking-[0.16rem] text-white/50">START TODAY</p>
        <h2 className="text-[3rem] font-normal leading-[0.9] tracking-tight text-white md:text-[5.5rem]">
          Stop typing.
          <br />
          <span className="font-serif-italic">Start recording.</span>
        </h2>
        <a
          href="#"
          className="mt-9 flex items-center gap-2 rounded-full bg-white py-2 pl-6 pr-2 text-[0.9375rem] font-normal text-[#090b0c] transition-opacity hover:opacity-85"
        >
          Start recording free
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#090b0c] text-white">
            <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: "1rem" }} />
          </span>
        </a>
        <p className="mt-4 text-sm font-normal text-white/45">No credit card required.</p>
      </Reveal>
    </section>
  );
}
