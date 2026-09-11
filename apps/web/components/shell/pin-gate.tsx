"use client";

import { useRef, useState } from "react";

export function PinGate({
  videoId,
  onUnlock,
}: {
  videoId: string;
  onUnlock: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError(false);

    try {
      const res = await fetch(`/api/videos/${videoId}/pin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      if (res.ok) {
        sessionStorage.setItem(`pin-unlocked-${videoId}`, "1");
        onUnlock();
      } else {
        setError(true);
        setValue("");
        inputRef.current?.focus();
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <div className="mb-2 text-[1.125rem] font-medium text-[#090b0c]">
          This video is protected
        </div>
        <div className="text-[0.875rem] text-[#090b0c]/50">
          Enter the PIN to watch
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(false);
          }}
          placeholder="000000"
          autoFocus
          className={`w-40 rounded-xl border px-4 py-3 text-center font-mono text-[1.5rem] tracking-[0.3em] focus:outline-none ${
            error
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-black/[.12] bg-white text-[#090b0c] focus:border-black/30"
          }`}
        />
        {error && (
          <p className="text-[0.8125rem] text-red-500">Incorrect PIN. Try again.</p>
        )}
        <button
          type="submit"
          disabled={value.length !== 6 || busy}
          className="h-10 rounded-full bg-[#090b0c] px-8 text-[0.875rem] font-medium text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "Checking…" : "Watch"}
        </button>
      </form>
    </div>
  );
}
