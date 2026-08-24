"use client";

import { useState } from "react";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
  clientKey?: string;
}

export function UpgradeModal({
  open,
  onClose,
  featureName,
  clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "",
}: UpgradeModalProps) {
  const [loading, setLoading] = useState<"pro" | "business" | null>(null);

  if (!open) return null;

  const handleUpgrade = async (plan: "pro" | "business") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!data.data?.snapToken) throw new Error("No snap token");

      if (!window.snap) {
        const isProduction =
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = isProduction
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js";
          script.setAttribute("data-client-key", clientKey);
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      window.snap!.pay(data.data.snapToken, {
        onSuccess: () => {
          window.location.reload();
        },
        onPending: () => {
          onClose();
        },
        onError: () => {
          setLoading(null);
        },
        onClose: () => {
          setLoading(null);
        },
      });
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-3xl border border-black/[.08] bg-white p-6">
        <h2 className="mb-1 text-lg font-medium tracking-tight">
          Upgrade your plan
        </h2>
        <p className="mb-4 text-[0.875rem] text-[#090b0c]/50">
          <strong>{featureName}</strong> is available on Pro and Business plans.
        </p>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/[.08] p-3">
            <p className="text-[0.9375rem] font-medium">Pro</p>
            <p className="mb-2 text-[0.8125rem] text-[#090b0c]/50">
              Rp50.000/bln
            </p>
            <p className="text-[0.75rem] text-[#090b0c]/60">
              Unlimited videos · 30 min · Add Audio
            </p>
          </div>
          <div className="rounded-2xl border border-black/[.08] p-3">
            <p className="text-[0.9375rem] font-medium">Business</p>
            <p className="mb-2 text-[0.8125rem] text-[#090b0c]/50">
              Rp100.000/bln
            </p>
            <p className="text-[0.75rem] text-[#090b0c]/60">
              Unlimited videos · Unlimited duration
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleUpgrade("pro")}
            disabled={loading !== null}
            className="flex-1 rounded-xl bg-[#090b0c] py-2 text-[0.8125rem] font-medium text-white disabled:opacity-50"
          >
            {loading === "pro" ? "Loading..." : "Get Pro"}
          </button>
          <button
            onClick={() => handleUpgrade("business")}
            disabled={loading !== null}
            className="flex-1 rounded-xl bg-[#090b0c] py-2 text-[0.8125rem] font-medium text-white disabled:opacity-50"
          >
            {loading === "business" ? "Loading..." : "Get Business"}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-[0.8125rem] text-[#090b0c]/40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
