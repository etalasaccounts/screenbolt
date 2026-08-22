"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "./reveal";

function MetricCounter({
  target,
  suffix = "",
  decimals = 0,
}: {
  target: number;
  suffix?: string;
  decimals?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const duration = 1400;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <div
      ref={ref}
      className="text-[3.5rem] font-normal leading-none tracking-tight text-[#090b0c] tabular-nums md:text-[5rem]"
    >
      {value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </div>
  );
}

const METRICS = [
  { target: 14000, suffix: "+", label: "Videos recorded" },
  { target: 1.2, decimals: 1, suffix: "M", label: "Minutes watched" },
  { target: 3000, suffix: "+", label: "Teams on Screenbolt" },
];

export function Metrics() {
  return (
    <section
      id="metrics"
      className="overflow-hidden bg-[#f5f5f2] px-5 py-20 md:px-12"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 sm:grid-cols-3">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="border-t border-black/15 pt-6"
            >
              <MetricCounter
                target={m.target}
                suffix={m.suffix}
                decimals={m.decimals}
              />
              <p className="mt-4 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
