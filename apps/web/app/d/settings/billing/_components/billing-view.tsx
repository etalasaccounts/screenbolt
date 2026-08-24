"use client";

import { useState } from "react";
import Link from "next/link";

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

interface BillingViewProps {
  plan: "free" | "pro" | "business";
  subscription: { status: string; currentPeriodEnd: string | null } | null;
  clientKey: string;
  isProduction: boolean;
}

const PLAN_DETAILS: Record<
  "free" | "pro" | "business",
  {
    label: string;
    price: string;
    videos: string;
    duration: string;
    audio: boolean;
  }
> = {
  free: {
    label: "Free",
    price: "Rp0/bln",
    videos: "15 videos",
    duration: "5 min/video",
    audio: false,
  },
  pro: {
    label: "Pro",
    price: "Rp50.000/bln",
    videos: "Unlimited videos",
    duration: "30 min/video",
    audio: true,
  },
  business: {
    label: "Business",
    price: "Rp100.000/bln",
    videos: "Unlimited videos",
    duration: "Unlimited duration",
    audio: true,
  },
};

export function BillingView({
  plan,
  subscription,
  clientKey,
  isProduction,
}: BillingViewProps) {
  const [loading, setLoading] = useState<"pro" | "business" | null>(null);

  const handleUpgrade = async (targetPlan: "pro" | "business") => {
    setLoading(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!data.data?.snapToken) throw new Error("No snap token");

      if (!window.snap) {
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
          window.location.reload();
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-9 border-b border-black/[.07] pb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px w-4 bg-[#090b0c]/40" />
          <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
            Settings
          </p>
        </div>
        <h1 className="text-[2.25rem] font-normal leading-[0.98] tracking-tight text-[#090b0c] md:text-[2.75rem]">
          Your <span className="font-serif-italic">plan</span>
        </h1>
      </div>

      <div className="mb-6 flex gap-2">
        <Link
          href="/d/settings"
          className="rounded-full border border-black/[.08] px-4 py-1.5 text-[0.8125rem] font-medium"
        >
          Account
        </Link>
        <Link
          href="/d/settings/billing"
          className="rounded-full border border-black/[.08] bg-black/[.06] px-4 py-1.5 text-[0.8125rem] font-medium"
        >
          Billing
        </Link>
      </div>

      {subscription && (
        <section className="mb-6 rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
          <p className="mb-1 text-[0.8125rem] text-[#090b0c]/45">
            Subscription status
          </p>
          <p className="text-[0.9375rem] font-medium capitalize">
            {subscription.status}
          </p>
          {subscription.currentPeriodEnd && (
            <p className="mt-1 text-[0.8125rem] text-[#090b0c]/45">
              Renews{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                "id-ID",
                { day: "numeric", month: "long", year: "numeric" },
              )}
            </p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["free", "pro", "business"] as const).map((p) => {
            const d = PLAN_DETAILS[p];
            const isCurrent = p === plan;
            return (
              <div
                key={p}
                className={`flex flex-col gap-4 rounded-2xl border p-5 ${
                  isCurrent
                    ? "border-black/[.15] bg-black/[.03]"
                    : "border-black/[.08]"
                }`}
              >
                <div>
                  <p className="mb-0.5 text-[0.9375rem] font-medium">
                    {d.label}
                  </p>
                  <p className="text-[0.8125rem] text-[#090b0c]/45">
                    {d.price}
                  </p>
                </div>
                <ul className="flex flex-col gap-1.5 text-[0.8125rem] text-[#090b0c]/70">
                  <li>{d.videos}</li>
                  <li>{d.duration}</li>
                  <li>{d.audio ? "✓ Add Audio" : "✗ Add Audio"}</li>
                </ul>
                {!isCurrent && p !== "free" && (
                  <button
                    onClick={() => handleUpgrade(p)}
                    disabled={loading === p}
                    className="mt-auto w-full rounded-xl bg-[#090b0c] py-2 text-[0.8125rem] font-medium text-white disabled:opacity-50"
                  >
                    {loading === p ? "Loading..." : `Get ${d.label}`}
                  </button>
                )}
                {isCurrent && (
                  <span className="mt-auto text-[0.75rem] text-[#090b0c]/40">
                    Current plan
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
