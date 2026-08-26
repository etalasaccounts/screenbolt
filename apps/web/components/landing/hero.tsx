import { Icon } from "@iconify/react";
import { Reveal } from "./reveal";
import { LandingNav } from "./landing-nav";

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

      <LandingNav />

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
