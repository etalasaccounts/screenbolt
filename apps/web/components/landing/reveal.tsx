"use client";

import { useEffect, useRef, useState } from "react";

/** Fires once when the element scrolls within 100px of the viewport. */
export function useInView<T extends HTMLElement>(immediate = false) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  return [ref, inView] as const;
}

const EASE = "cubic-bezier(.22,1,.36,1)";

export function Reveal({
  children,
  className,
  x = 0,
  y = 0,
  blur = 0,
  delay = 0,
  duration = 800,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  x?: number;
  y?: number;
  blur?: number;
  delay?: number;
  duration?: number;
  immediate?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(immediate);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translate(0,0)" : `translate(${x}px, ${y}px)`,
        filter: inView ? "blur(0)" : `blur(${blur}px)`,
        transition: inView
          ? `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms, filter ${duration}ms ease-out ${delay}ms`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}
