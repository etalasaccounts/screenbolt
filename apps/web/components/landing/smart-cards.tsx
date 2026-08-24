"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Reveal, useInView } from "./reveal";

const QUESTIONS = [
  {
    q: "Can you summarize my recording?",
    a: "Sure — in your latest video you walked through the new onboarding flow and shared the launch date of October 12.",
  },
  {
    q: "Who has watched my video?",
    a: "14 people have watched so far. Dana watched the full 2:34, while 3 others dropped off after the intro.",
  },
  {
    q: "What should I title this?",
    a: "I'd suggest \"New onboarding walkthrough — 2 min\" based on the topics covered.",
  },
];

function QaRotator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUESTIONS.length);
        setVisible(true);
      }, 650);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const current = QUESTIONS[index];
  const style = {
    transition: "opacity 600ms cubic-bezier(.22,1,.36,1), transform 600ms cubic-bezier(.22,1,.36,1), filter 600ms cubic-bezier(.22,1,.36,1)",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(-6px)",
    filter: visible ? "blur(0)" : "blur(8px)",
  };

  return (
    <div className="relative h-40">
      <div className="absolute inset-0" style={style}>
        <p className="mb-3 text-[1rem] font-normal leading-[1.4] text-white">{current.q}</p>
        <div className="flex items-start gap-2">
          <div className="flex h-5 shrink-0 items-center justify-center rounded-md bg-white/15 px-1.5">
            <Image src="/logo.svg" alt="" width={16} height={8} className="h-2 w-auto opacity-80" />
          </div>
          <p className="m-0 text-[0.75rem] font-normal leading-[1.6] text-white/55">{current.a}</p>
        </div>
      </div>
    </div>
  );
}

function ViewerInsightsChart() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const rectRef = useRef<SVGRectElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const start = performance.now() + 300;
    let frame: number;
    const draw = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / 1400));
      const eased = 1 - Math.pow(1 - t, 3);
      rectRef.current?.setAttribute("width", String(220 * eased));
      if (t < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const t1 = setTimeout(() => {
      if (lineRef.current) {
        lineRef.current.style.transition = "stroke-dashoffset 500ms ease-out";
        lineRef.current.style.strokeDashoffset = "0";
      }
    }, 1400);
    const t2 = setTimeout(() => {
      if (dotRef.current) {
        dotRef.current.style.transition = "transform 300ms ease-out";
        dotRef.current.style.transform = "scale(1)";
      }
    }, 1700);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inView]);

  return (
    <div ref={ref} className="relative mx-auto h-[145px] w-[280px] max-w-full overflow-visible">
      <svg viewBox="60 -25 220 145" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(180,210,80,.85)" />
            <stop offset="100%" stopColor="rgba(180,210,80,.10)" />
          </linearGradient>
          <clipPath id="reveal">
            <rect ref={rectRef} x="60" y="-25" width="0" height="145" />
          </clipPath>
        </defs>
        <g clipPath="url(#reveal)">
          <path d="M 60 75 L 150 20 L 280 28 L 280 120 L 60 120 Z" fill="url(#areaFill)" />
          <path d="M 60 75 L 150 20 L 280 28" fill="none" stroke="#8DB800" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <line x1="60" y1="75" x2="60" y2="120" stroke="#8DB800" strokeWidth="1" strokeDasharray="3 3" opacity=".6" />
          <line x1="280" y1="28" x2="280" y2="120" stroke="#8DB800" strokeWidth="1" strokeDasharray="3 3" opacity=".6" />
        </g>
        <line ref={lineRef} x1="150" y1="-15" x2="150" y2="20" stroke="#1DC47D" strokeWidth="1.2" strokeDasharray="36" strokeDashoffset="36" />
        <circle ref={dotRef} cx="150" cy="-15" r="4.5" fill="#1DC47D" style={{ transformBox: "fill-box", transformOrigin: "center", transform: "scale(0)" }} />
      </svg>
    </div>
  );
}

const TREE_PATHS = [
  "M180 44 C180 73,105 73,105 102",
  "M180 44 C180 73,255 73,255 102",
  "M105 140 C105 166,105 166,105 192",
  "M255 140 C255 166,255 166,255 192",
  "M180 44 C180 171,180 171,180 298",
  "M180 334 C180 347,180 347,180 360",
];
const TREE_DOTS = [
  { cx: 105, cy: 102 },
  { cx: 255, cy: 102 },
  { cx: 105, cy: 192 },
  { cx: 255, cy: 192 },
  { cx: 180, cy: 298 },
  { cx: 180, cy: 360 },
];
const TREE_BEGINS = [".85s", "1s", "1.2s", "1.38s", "1.55s", "1.75s"];

function SmartChaptersTree() {
  const [ref, inView] = useInView<HTMLDivElement>();

  const nodeStyle = (delay: number) => ({
    transition: `opacity 450ms ease-out ${delay + 450}ms, transform 450ms ease-out ${delay + 450}ms`,
    opacity: inView ? 1 : 0,
    transform: inView ? "scale(1)" : "scale(.85)",
  });

  return (
    <div ref={ref} className="absolute left-4 right-4 top-8 bottom-[110px] z-[2]">
      <svg className="absolute inset-0 z-[1] h-full w-full overflow-visible" viewBox="0 0 360 380" preserveAspectRatio="none">
        <defs>
          {TREE_PATHS.map((d, i) => (
            <path key={i} id={`tree-path-${i}`} d={d} />
          ))}
        </defs>
        <g style={{ transition: "opacity 700ms ease-out 700ms", opacity: inView ? 1 : 0 }}>
          {TREE_PATHS.map((d, i) => (
            <path key={i} d={d} stroke="rgba(255,255,255,.35)" strokeWidth="1" fill="none" />
          ))}
          {TREE_DOTS.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r="2.5" fill="rgba(255,255,255,.9)" />
          ))}
          {TREE_BEGINS.map((begin, i) => (
            <circle key={i} r="3" fill="#fff" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,.8))" }}>
              <animateMotion dur="2.4s" repeatCount="indefinite" begin={begin}>
                <mpath href={`#tree-path-${i}`} />
              </animateMotion>
            </circle>
          ))}
        </g>
      </svg>

      <div className="relative z-[2] flex h-full flex-col items-center gap-[18px]">
        <div className="rounded-full border px-5 py-2.5 text-[1rem] font-serif-italic text-white" style={{ ...nodeStyle(0), borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.10)", backdropFilter: "blur(20px)" }}>
          Auto Chapters
        </div>
        <div className="flex gap-4">
          <div className="rounded-full border px-5 py-2.5 text-[1rem] font-serif-italic text-white" style={{ ...nodeStyle(180), borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.10)", backdropFilter: "blur(20px)" }}>
            Intro
          </div>
          <div className="rounded-full border px-5 py-2.5 text-[1rem] font-serif-italic text-white" style={{ ...nodeStyle(360), borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.10)", backdropFilter: "blur(20px)" }}>
            Demo
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="max-w-[160px] rounded-xl px-4 py-2.5 text-[0.75rem] font-normal leading-[1.5] text-black/75" style={{ ...nodeStyle(540), background: "rgba(255,255,255,.92)" }}>
            Hook, agenda, quick intro
          </div>
          <div className="max-w-[160px] rounded-xl px-4 py-2.5 text-[0.75rem] font-normal leading-[1.5] text-black/75" style={{ ...nodeStyle(720), background: "rgba(255,255,255,.92)" }}>
            Screen share, walkthrough, highlights
          </div>
        </div>
        <div className="mt-auto rounded-full border px-5 py-2.5 text-[1rem] font-serif-italic text-white" style={{ ...nodeStyle(900), borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.10)", backdropFilter: "blur(20px)" }}>
          Next steps
        </div>
        <div className="max-w-[160px] rounded-xl px-4 py-2.5 text-center text-[0.75rem] font-normal leading-[1.5] text-black/75" style={{ ...nodeStyle(1080), background: "rgba(255,255,255,.92)" }}>
          Recap, action items, CTA
        </div>
      </div>
    </div>
  );
}

export function SmartCards() {
  return (
    <div className="mt-16 flex flex-col items-stretch gap-4 lg:flex-row">
      <Reveal y={40} delay={200} duration={700} className="relative min-h-[560px] flex-1 overflow-hidden rounded-3xl">
        <Image src="/artwork-daisy.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
        <div className="absolute inset-0 z-[1] bg-black/50" />

        <div className="absolute left-6 right-6 top-8 z-[2] rounded-[20px] border p-5" style={{ borderColor: "rgba(255,255,255,.20)", background: "rgba(255,255,255,.10)", backdropFilter: "blur(56px)" }}>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-10 items-center justify-center rounded-xl bg-white px-3">
              <Image src="/logo.svg" alt="" width={40} height={12} className="h-3 w-auto brightness-0" />
            </div>
            <span className="text-[1rem] font-normal text-white">Screenbolt</span>
          </div>
          <div className="mb-4 border-t border-dashed border-white/20" />
          <QaRotator />
          <div className="mt-4 flex items-center justify-between">
            <button className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-[0.8125rem] font-normal text-black">
              View video
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black text-white">
                <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: ".75rem" }} />
              </span>
            </button>
            <a className="text-[0.8125rem] font-normal text-white/80 underline" href="#">ASK AI</a>
          </div>
        </div>

        <div className="absolute bottom-7 left-6 right-6 z-[2]">
          <h3 className="mb-2 text-[1.625rem] font-serif-italic tracking-tight text-white">Ask your videos anything</h3>
          <p className="text-[0.8125rem] font-normal leading-[1.6] text-white/65">Type a question and Screenbolt&apos;s AI answers from your video&apos;s transcript.</p>
        </div>
      </Reveal>

      <Reveal y={40} delay={350} duration={700} className="relative min-h-[560px] flex-1 overflow-hidden rounded-3xl">
        <Image src="/artwork-yard.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
        <div className="absolute inset-0 z-[1] bg-black/20" />

        <div className="absolute left-6 right-6 top-8 z-[2]">
          <div className="rounded-[20px] px-5 pb-5 pt-6 text-center" style={{ background: "rgba(255,255,255,.92)" }}>
            <div className="mb-1 text-[0.75rem] font-normal leading-[1.5] text-black/50">
              Watch time
              <br />
              up this month
            </div>
            <div className="text-[3.25rem] font-serif-italic leading-none tracking-tight text-black">+18%</div>
            <div className="h-4" />
            <ViewerInsightsChart />
            <div className="mt-4 inline-block rounded-full border px-4 py-2 text-center text-[0.6875rem] text-black/60" style={{ borderColor: "rgba(0,0,0,.12)", background: "rgba(255,255,255,.80)", backdropFilter: "blur(8px)" }}>
              Tip: Add chapters so viewers can jump to the part they need.
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 left-6 right-6 z-[2]">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[1.625rem] font-serif-italic tracking-tight text-white">Viewer Insights</h3>
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[0.625rem] font-normal uppercase tracking-[0.08rem] text-white/75">
              Coming soon
            </span>
          </div>
          <p className="text-[0.8125rem] font-normal leading-[1.6] text-white/65">Next up: see where viewers watch, rewatch, and drop off — so you can make tighter videos.</p>
        </div>
      </Reveal>

      <Reveal y={40} delay={500} duration={700} className="relative min-h-[560px] flex-1 overflow-hidden rounded-3xl">
        <Image src="/sky-artwork.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
        <div className="absolute inset-0 z-[1] bg-black/30" />

        <SmartChaptersTree />

        <div className="absolute bottom-7 left-6 right-6 z-[2]">
          <h3 className="mb-2 text-[1.625rem] font-serif-italic tracking-tight text-white">Smart Chapters</h3>
          <p className="text-[0.8125rem] font-normal leading-[1.6] text-white/65">Screenbolt detects topics in your recording and turns them into clickable chapters automatically.</p>
        </div>
      </Reveal>
    </div>
  );
}
