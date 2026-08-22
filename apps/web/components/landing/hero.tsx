import Image from "next/image";
import { Icon } from "@iconify/react";
import { Reveal } from "./reveal";

const LOGOS = [
  "https://qclay.design/lovable/synergy/logo-taa.png",
  "https://qclay.design/lovable/synergy/logo-harris.png",
  "https://qclay.design/lovable/synergy/logo-siemens.png",
  "https://qclay.design/lovable/synergy/logo-summit.png",
];

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen overflow-hidden bg-black"
    >
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        src="/video.mp4"
      />
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom,rgba(0,0,0,.60) 0%,rgba(0,0,0,.15) 50%,rgba(0,0,0,.65) 100%)",
        }}
      />

      <nav className="fixed left-0 right-0 top-0 z-50 px-4 py-4 md:px-8">
        <div className="relative flex h-12 items-center">
          <a href="#" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Screenbolt"
              width={100}
              height={22}
              className="h-[22px] w-auto"
              priority
            />
          </a>

          <div
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-1.5 md:flex"
            style={{
              background: "rgba(28,28,28,.75)",
              borderColor: "rgba(255,255,255,.10)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <a
              href="#"
              className="rounded-full px-4 py-2 text-[0.875rem] font-normal text-white/80 transition-colors hover:bg-white/10"
            >
              Product
            </a>
            <a
              href="#analytics"
              className="rounded-full px-4 py-2 text-[0.875rem] font-normal text-white/80 transition-colors hover:bg-white/10"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="rounded-full px-4 py-2 text-[0.875rem] font-normal text-white/80 transition-colors hover:bg-white/10"
            >
              Pricing
            </a>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="/login"
              className="hidden rounded-full px-4 py-2 text-[0.875rem] text-white/80 sm:block"
            >
              Login
            </a>
            <a
              href="/signup"
              className="rounded-full bg-white px-5 py-2.5 text-[0.875rem] font-normal text-black"
            >
              Start recording
            </a>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5">
        <Reveal y={-40} duration={900} immediate>
          <h1 className="text-center text-[4rem] font-normal leading-[0.94] tracking-tight text-white md:text-[6.375rem]">
            <span className="block">Record your screen</span>
            <span className="block">
              <span>share it in </span>
              <span className="font-serif-italic">seconds</span>
            </span>
          </h1>
        </Reveal>

        <Reveal y={30} delay={250} duration={800} immediate>
          <button className="mt-8 flex items-center gap-2 rounded-full bg-white py-1.5 pl-6 pr-2 text-[0.9375rem] font-normal text-black">
            Start recording free
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
              <Icon
                icon="solar:arrow-right-up-linear"
                style={{ fontSize: ".875rem" }}
              />
            </span>
          </button>
        </Reveal>
      </div>

      <div className="absolute bottom-10 left-10 z-10 hidden lg:block">
        <h2 className="mb-[18px] text-[1.3125rem] font-normal leading-[1.2] tracking-tight text-white/60">
          Trusted by teams everywhere
        </h2>
        <div className="w-[430px] overflow-hidden">
          <div className="flex w-max animate-marquee gap-[54px]">
            {[...LOGOS, ...LOGOS].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                className="h-[30px] w-auto shrink-0 object-contain"
                style={{ filter: "brightness(0) invert(1) opacity(.55)" }}
                alt=""
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-10 hidden max-w-[430px] lg:block">
        <p className="mb-3 text-[1.3125rem] font-normal leading-[1.4] tracking-tight text-white">
          Screenbolt is the fastest way to record your screen and share it
          with anyone, anywhere.
        </p>
        <a href="#" className="text-[1.3125rem] font-normal tracking-tight text-white underline">
          Learn more
        </a>
      </div>
    </section>
  );
}
