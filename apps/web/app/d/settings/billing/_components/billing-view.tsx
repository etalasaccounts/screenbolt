"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useBillingPlan } from "@/lib/hooks/use-account-data";

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
    features: { text: string; included: boolean }[];
  }
> = {
  free: {
    label: "Free",
    price: "Rp0/bln",
    features: [
      { text: "15 videos", included: true },
      { text: "5 min/video", included: true },
      { text: "Add Audio", included: false },
    ],
  },
  pro: {
    label: "Pro",
    price: "Rp50.000/bln",
    features: [
      { text: "Unlimited videos", included: true },
      { text: "30 min/video", included: true },
      { text: "Add Audio", included: true },
    ],
  },
  business: {
    label: "Business",
    price: "Rp100.000/bln",
    features: [
      { text: "Unlimited videos", included: true },
      { text: "Unlimited duration", included: true },
      { text: "Add Audio", included: true },
    ],
  },
};

export function BillingView({
  plan,
  subscription,
  clientKey,
  isProduction,
}: BillingViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: billingData } = useBillingPlan();
  // Use live client-side subscription status so cancel button reacts to
  // invalidateQueries without needing a full page reload.
  const liveSub = billingData?.subscription ?? subscription;
  const livePlan = (billingData?.plan ?? plan) as "free" | "pro" | "business";
  const [loading, setLoading] = useState<"pro" | "business" | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const orderIdRef = useRef<string | null>(null);

  const refreshBilling = () => {
    queryClient.invalidateQueries({ queryKey: ["billing-plan"] });
    router.refresh();
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (data.data?.cancelled) {
        toast.success("Subscription cancelled. You'll keep access until the period ends.");
        refreshBilling();
      } else {
        toast.error(data.error?.message ?? "Could not cancel subscription.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  const verifyAndReload = async () => {
    const orderId = orderIdRef.current;
    if (!orderId) { window.location.reload(); return; }
    try {
      const res = await fetch("/api/billing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.data?.activated) {
        toast.success("Subscription activated! Your plan has been upgraded.");
      } else {
        toast.info(`Payment status: ${data.data?.status ?? "pending"}. Your plan will update once confirmed.`);
      }
    } catch {
      toast.error("Could not verify payment. Please refresh the page.");
    } finally {
      setLoading(null);
      refreshBilling();
    }
  };

  const handleUpgrade = async (targetPlan: "pro" | "business") => {
    setLoading(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!data.data?.snapToken) throw new Error(`No snap token. Response: ${JSON.stringify(data)}`);
      // Store orderId embedded in the snapToken payload via checkout — we need it from the server
      // The checkout route only returns snapToken; re-fetch orderId via verify using snap callbacks
      // Instead, store orderId from the token by asking checkout to return it
      if (data.data?.orderId) orderIdRef.current = data.data.orderId;

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
        onSuccess: () => verifyAndReload(),
        onPending: () => verifyAndReload(),
        onError: () => {
          toast.error("Payment failed. Please try again.");
          setLoading(null);
        },
        onClose: () => {
          setLoading(null);
        },
      });
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
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

      {liveSub?.status === "cancelling" && liveSub.currentPeriodEnd && (
        <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6 flex items-start gap-3">
          <svg className="mt-0.5 shrink-0 text-amber-500" width="16" height="16" viewBox="0 0 15 15" fill="none">
            <path d="M8.4449 0.608765C8.0183 -0.107015 6.9817 -0.107015 6.55509 0.608765L0.161178 11.3368C-0.275824 12.07 0.252503 13 1.10608 13H13.8939C14.7475 13 15.2758 12.07 14.8388 11.3368L8.4449 0.608765ZM7.4141 1.12073C7.45288 1.05566 7.54712 1.05566 7.5859 1.12073L13.9798 11.8488C14.0196 11.9154 13.9715 12 13.8939 12H1.10608C1.02849 12 0.980454 11.9154 1.02018 11.8488L7.4141 1.12073ZM6.8269 4.48611C6.81221 4.10423 7.11783 3.78663 7.5 3.78663C7.88217 3.78663 8.18778 4.10423 8.1731 4.48611L8.01921 8.48686C8.00848 8.76585 7.77908 8.98663 7.5 8.98663C7.22092 8.98663 6.99152 8.76585 6.98079 8.48686L6.8269 4.48611ZM8.24989 10.476C8.24989 10.8902 7.9141 11.226 7.49989 11.226C7.08568 11.226 6.74989 10.8902 6.74989 10.476C6.74989 10.0618 7.08568 9.72599 7.49989 9.72599C7.9141 9.72599 8.24989 10.0618 8.24989 10.476Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="text-[0.8125rem] font-medium text-amber-800">Subscription cancelled</p>
            <p className="text-[0.8125rem] text-amber-700/80">
              You still have full access until{" "}
              <span className="font-medium">
                {new Date(liveSub!.currentPeriodEnd!).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              . After that, your account will revert to the Free plan.
            </p>
          </div>
        </section>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="mb-1 text-[0.9375rem] font-medium text-[#090b0c]">Cancel subscription?</p>
            <p className="mb-5 text-[0.8125rem] text-[#090b0c]/55">
              You&apos;ll keep full access until{" "}
              {liveSub?.currentPeriodEnd
                ? new Date(liveSub.currentPeriodEnd).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : "the period ends"}
              . After that, your account reverts to the Free plan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-black/[.08] py-2 text-[0.8125rem] font-medium text-[#090b0c] disabled:opacity-50"
              >
                Keep plan
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 rounded-xl bg-red-600 py-2 text-[0.8125rem] font-medium text-white disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["free", "pro", "business"] as const).map((p) => {
            const d = PLAN_DETAILS[p];
            const isCurrent = p === livePlan;
            return (
              <div
                key={p}
                className={`flex flex-col gap-4 rounded-2xl border p-7 min-h-72 transition-shadow duration-200 ${
                  isCurrent
                    ? "border-transparent bg-[#090b0c]"
                    : "border-black/[.08] hover:shadow-md hover:border-black/[.15] cursor-pointer"
                }`}
              >
                <div>
                  <p className={`mb-0.5 text-[0.9375rem] font-medium ${isCurrent ? "text-white" : ""}`}>
                    {d.label}
                  </p>
                  <p className={`text-[0.8125rem] ${isCurrent ? "text-white/50" : "text-[#090b0c]/45"}`}>
                    {d.price}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-[0.8125rem]">
                  {d.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2">
                      {f.included ? (
                        <svg className={`shrink-0 ${isCurrent ? "text-white/70" : "text-green-500"}`} width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
                        </svg>
                      ) : (
                        <svg className={`shrink-0 ${isCurrent ? "text-white/25" : "text-[#090b0c]/25"}`} width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
                        </svg>
                      )}
                      <span className={
                        isCurrent
                          ? (f.included ? "font-medium text-white" : "text-white/30 line-through")
                          : (f.included ? "font-medium text-[#090b0c]" : "text-[#090b0c]/35 line-through")
                      }>{f.text}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="mt-auto w-full rounded-xl bg-white py-2 text-[0.8125rem] font-medium text-[#090b0c] cursor-default"
                  >
                    Current
                  </button>
                ) : p === "free" ? (
                  <button
                    disabled
                    className="mt-auto w-full rounded-xl border border-black/[.08] py-2 text-[0.8125rem] font-medium text-[#090b0c]/35 cursor-default"
                  >
                    Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(p)}
                    disabled={loading === p}
                    className="mt-auto w-full rounded-xl bg-[#090b0c] py-2 text-[0.8125rem] font-medium text-white disabled:opacity-50"
                  >
                    {loading === p ? "Loading..." : `Get ${d.label}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {liveSub?.status === "active" && livePlan !== "free" && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-[0.8125rem] text-[#090b0c]/40 underline-offset-2 hover:text-red-500 hover:underline transition-colors"
            >
              Cancel subscription
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
