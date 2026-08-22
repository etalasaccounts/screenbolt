"use client";

import { useEffect, useRef, useState } from "react";

export function CountdownOverlay({
  seconds = 3,
  onComplete,
}: {
  seconds?: number;
  onComplete: () => void;
}) {
  const [count, setCount] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    if (count <= 0) {
      // Guard against React StrictMode's dev-mode double-invoke firing
      // this twice, which would start two MediaRecorders.
      if (!firedRef.current) {
        firedRef.current = true;
        onComplete();
      }
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <span
        key={count}
        className="animate-countdown-pop font-serif-italic text-[9rem] leading-none text-white"
      >
        {count}
      </span>
    </div>
  );
}
