"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Reveal, useInView } from "./reveal";

function CountUp({ to, className }: { to: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const duration = 1200;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to]);

  return (
    <div ref={ref} className={className}>
      {value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
    </div>
  );
}

const BARS = [
  { label: "Watch time", value: "8,200 min", width: "75%", color: "linear-gradient(90deg,#1DC47D 60.8%,rgba(29,196,125,0) 100%)" },
  { label: "Unique viewers", value: "4,250", width: "45%", color: "linear-gradient(90deg,#B48F17 55.74%,rgba(180,143,23,0) 100%)" },
  { label: "Shares", value: "1,860", width: "60%", color: "linear-gradient(90deg,#fff 52.46%,rgba(255,255,255,0) 100%)" },
];

export function Analytics() {
  return (
    <section
      id="analytics"
      className="overflow-hidden bg-[#f5f5f2] px-5 py-20 md:px-12"
    >
      <div className="mb-16 text-center">
        <div className="mb-4 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
          ANALYTICS
        </div>
        <Reveal y={30} blur={12} duration={800}>
          <h2 className="m-0 text-[#090b0c]">
            <span className="block text-[3.5rem] font-normal leading-none tracking-tight md:text-[4.5rem]">
              See how your videos
            </span>
            <span className="block font-serif-italic text-[3.5rem] leading-none tracking-tight md:text-[4.5rem]">
              perform at a glance
            </span>
          </h2>
        </Reveal>
        <Reveal y={20} blur={8} delay={200} duration={800}>
          <p className="mt-4 text-[1rem] font-normal text-[#090b0c]/60">
            Track views, watch time, and engagement in real time.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto flex max-w-[1280px] flex-col items-stretch gap-4 lg:flex-row">
        <Reveal
          x={-60}
          delay={300}
          duration={800}
          className="relative min-h-[480px] flex-[1.4] overflow-hidden rounded-3xl"
        >
          <Image src="/artwork-green-wall.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
          <div className="absolute inset-0 z-[1] bg-black/[.42]" />

          <div className="absolute left-8 right-8 top-8 z-[2] rounded-[20px] border px-7 py-6" style={{ borderColor: "rgba(255,255,255,.20)", background: "rgba(255,255,255,.10)", backdropFilter: "blur(56px)" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.6875rem] font-normal tracking-[0.09375rem] text-white/60">VIEWS THIS MONTH</span>
              <span className="text-[0.6875rem] font-normal tracking-[0.09375rem] text-white/60 underline">LAST 30 DAYS</span>
            </div>
            <CountUp to={12480} className="mb-6 text-[2.625rem] font-normal tracking-tight text-white tabular-nums" />
            <div className="mb-5 w-full border-t border-dashed border-white/20" />

            {BARS.map((bar) => (
              <div key={bar.label} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between text-[0.8125rem]">
                  <span className="text-white/70">{bar.label}</span>
                  <span className="font-normal text-white">{bar.value}</span>
                </div>
                <div className="relative mt-1.5 h-[5px] w-full overflow-hidden rounded-full">
                  <div className="absolute inset-0 opacity-[.13]" style={{ background: "linear-gradient(90deg,#040504 0%,rgba(4,5,4,.50) 100%)" }} />
                  <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: bar.width, background: bar.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-[22px] left-8 right-8 z-[2]">
            <h3 className="mb-2 text-[1.625rem] font-serif-italic tracking-tight text-white">
              See the full picture of your video performance.
            </h3>
            <p className="m-0 text-[0.8125rem] font-normal leading-[1.6] text-white/65">
              Screenbolt tracks every view and every minute watched, so you always know what&apos;s landing with your audience.
            </p>
          </div>
        </Reveal>

        <Reveal
          x={60}
          delay={450}
          duration={800}
          className="relative min-h-[480px] flex-1 overflow-hidden rounded-3xl"
        >
          <Image src="/artwork-blue-glass.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
          <div className="absolute inset-0 z-[1] bg-black/[.42]" />
          <div className="absolute right-6 top-6 z-[2] text-[0.6875rem] font-normal tracking-[0.09375rem] text-white/70 underline">TODAY</div>

          <div className="absolute left-8 top-8 z-[2] w-[200px] rounded-2xl bg-white px-[18px] py-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <CountUp to={925} className="text-[1.375rem] font-normal tracking-tight text-black tabular-nums" />
              <Icon icon="solar:info-circle-linear" style={{ fontSize: "1rem", color: "rgba(0,0,0,.35)" }} />
            </div>
            <div className="mb-3.5 text-[0.75rem] text-black/45">Views today</div>
            <button className="flex w-full items-center justify-between rounded-full bg-black py-2.5 pl-3.5 pr-2 text-[0.8125rem] font-normal text-white">
              View video
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: ".8125rem" }} />
              </span>
            </button>
          </div>

          <Image
            src="/artwork-korean-women.webp"
            alt=""
            width={200}
            height={240}
            className="absolute bottom-[140px] left-1/2 z-[2] h-[240px] w-[200px] -translate-x-1/2 rounded-2xl object-cover object-top"
          />
          <div className="absolute bottom-[160px] right-6 z-[3] flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 backdrop-blur-md" style={{ background: "rgba(255,255,255,.15)" }}>
              <Image src="/logo.svg" alt="" width={18} height={18} className="h-[18px] w-auto" />
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-white backdrop-blur-md" style={{ background: "rgba(255,255,255,.15)" }}>
              <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: "1rem" }} />
            </button>
          </div>

          <div className="absolute bottom-[22px] left-8 right-8 z-[2]">
            <h3 className="mb-2 text-[1.5rem] font-serif-italic tracking-tight text-white">Record. Share. Done.</h3>
            <p className="m-0 text-[0.8125rem] font-normal leading-[1.6] text-white/65">
              Share your recording as a link in one click and see who&apos;s watching in real time.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
