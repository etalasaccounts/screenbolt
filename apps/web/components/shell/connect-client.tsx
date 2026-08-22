"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

export function ConnectClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "approving" | "approved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setState("approving");
    setError(null);
    try {
      const res = await fetch("/api/extension/pair/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, label: "Chrome extension" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error?.message || "Could not approve this device");
        setState("error");
        return;
      }
      setState("approved");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "approved") {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
          <Icon icon="solar:check-circle-linear" style={{ fontSize: "1.75rem" }} />
        </div>
        <h1 className="text-2xl font-normal tracking-tight">Device approved</h1>
        <p className="mt-2 max-w-sm text-[0.9375rem] text-[#090b0c]/50">
          You can close this tab. The Screenbolt extension will finish connecting automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[.06]">
        <Icon icon="solar:shield-keyhole-linear" style={{ fontSize: "1.75rem" }} />
      </div>
      <h1 className="text-2xl font-normal tracking-tight">Approve this device?</h1>
      <p className="mt-2 text-[0.9375rem] text-[#090b0c]/50">
        A Screenbolt Chrome extension wants to connect to your account and upload recordings
        to your active workspace.
      </p>

      {state === "error" && error && (
        <div className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={approve}
        disabled={state === "approving"}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[#090b0c] px-6 text-[0.9375rem] text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {state === "approving" ? "Approving…" : "Approve this device"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/account")}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-full text-[0.9375rem] text-[#090b0c]/60 transition-colors hover:text-[#090b0c]"
      >
        Cancel
      </button>
    </div>
  );
}
