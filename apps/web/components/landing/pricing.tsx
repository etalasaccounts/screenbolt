import { Icon } from "@iconify/react";
import { Reveal } from "./reveal";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    tagline: "For getting started.",
    features: ["Up to 25 videos", "5-minute recording limit", "Screen + camera", "Instant link sharing"],
    cta: "Start free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    badge: "Most popular",
    price: "$10",
    priceSuffix: "/mo",
    tagline: "For individuals who record often.",
    features: ["Unlimited videos & length", "AI titles & transcripts", "Remove filler words", "View analytics"],
    cta: "Go Pro",
    variant: "dark" as const,
  },
  {
    name: "Business",
    price: "$25",
    priceSuffix: "/user/mo",
    tagline: "For teams who need more.",
    features: ["Everything in Pro", "Shared workspace", "Team analytics", "SSO & admin controls"],
    cta: "Contact sales",
    variant: "outline" as const,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="overflow-hidden bg-[#f5f5f2] px-5 py-20 md:px-12">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-20 text-center">
          <div className="mb-4 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
            PRICING
          </div>
          <Reveal y={30} blur={12} duration={800}>
            <h2 className="m-0 text-[#090b0c]">
              <span className="block text-[3.5rem] font-normal leading-none tracking-tight md:text-[4.5rem]">
                Start free. Upgrade
              </span>
              <span className="block font-serif-italic text-[3.5rem] leading-none tracking-tight md:text-[4.5rem]">
                when you&apos;re ready
              </span>
            </h2>
          </Reveal>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan, i) => {
            const dark = plan.variant === "dark";
            return (
              <Reveal
                key={plan.name}
                y={30}
                delay={i * 100}
                duration={700}
                className={
                  dark
                    ? "flex min-h-[26rem] flex-col rounded-3xl bg-[#090b0c] p-7 shadow-[0_24px_80px_rgba(0,0,0,.5)]"
                    : "flex min-h-[26rem] flex-col rounded-3xl border border-black/[.12] bg-black/[.04] p-7"
                }
              >
                <p className={`flex items-center justify-between text-xs font-normal uppercase tracking-[0.14rem] ${dark ? "text-white/50" : "text-[#090b0c]/50"}`}>
                  <span>{plan.name}</span>
                  {plan.badge && (
                    <span className="rounded-full bg-[#f5f5f2] px-3 py-1 text-[0.625rem] font-normal text-[#090b0c]">
                      {plan.badge}
                    </span>
                  )}
                </p>
                <p className={`mt-6 text-[3.5rem] font-normal leading-none tracking-tight ${dark ? "text-white" : "text-[#090b0c]"}`}>
                  {plan.price}
                  {plan.priceSuffix && (
                    <span className={`text-base ${dark ? "text-white/40" : "text-[#090b0c]/40"}`}>{plan.priceSuffix}</span>
                  )}
                </p>
                <p className={`mt-3 text-sm font-normal ${dark ? "text-white/45" : "text-[#090b0c]/45"}`}>{plan.tagline}</p>
                <ul className={`mt-8 space-y-3 text-sm font-normal ${dark ? "text-white/70" : "text-[#090b0c]/70"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Icon icon="solar:check-circle-linear" className="shrink-0" style={{ fontSize: "1.125rem" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={
                    dark
                      ? "mt-auto flex items-center justify-between rounded-full bg-[#f5f5f2] px-5 py-3 text-xs font-normal uppercase tracking-wider text-[#090b0c] transition-opacity hover:opacity-80"
                      : "mt-auto flex items-center justify-between rounded-full border border-black/20 px-5 py-3 text-xs font-normal uppercase tracking-wider text-[#090b0c] transition-colors hover:bg-[#090b0c] hover:text-white"
                  }
                >
                  {plan.cta}
                  <Icon icon="solar:arrow-right-linear" style={{ fontSize: "1.125rem" }} />
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
