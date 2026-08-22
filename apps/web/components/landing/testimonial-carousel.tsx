"use client";

import { useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    quote: (
      <>
        “We replaced half our standups with Screenbolt videos. The team is{" "}
        <span className="font-serif-italic">faster</span> and nobody misses a
        beat.”
      </>
    ),
    author: "Maya Chen · Head of Product",
  },
  {
    quote: (
      <>
        “Bug reports finally <span className="font-serif-italic">make sense</span>.
        A 20-second recording beats a paragraph of ‘it’s broken’.”
      </>
    ),
    author: "Dan Silva · Engineering Lead",
  },
  {
    quote: (
      <>
        “I record a quick walkthrough instead of a 30-minute call. Clients
        love it, and I <span className="font-serif-italic">get my day back</span>.”
      </>
    ),
    author: "Amara Reed · Founder",
  },
];

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 5000);
  };

  useEffect(() => {
    start();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return (
    <>
      <div className="relative min-h-[24rem] md:min-h-[22rem]">
        {TESTIMONIALS.map((t, i) => {
          const active = i === index;
          return (
            <figure
              key={i}
              className="absolute inset-0 m-0 flex flex-col items-center justify-center"
              style={{
                transition:
                  "opacity 700ms cubic-bezier(.22,1,.36,1), transform 700ms cubic-bezier(.22,1,.36,1)",
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(14px)",
                pointerEvents: active ? "auto" : "none",
              }}
            >
              <blockquote className="m-0 text-[2.5rem] font-normal leading-[1.1] tracking-tight text-[#090b0c] md:text-[4rem]">
                {t.quote}
              </blockquote>
              <figcaption className="mt-8 text-sm font-normal text-[#090b0c]/50">
                {t.author}
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="mt-12 flex items-center justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            aria-label={`Testimonial ${i + 1}`}
            onClick={() => {
              setIndex(i);
              start();
            }}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === index ? "2rem" : "0.5rem",
              background: i === index ? "rgba(0,0,0,.9)" : "rgba(0,0,0,.2)",
            }}
          />
        ))}
      </div>
    </>
  );
}
