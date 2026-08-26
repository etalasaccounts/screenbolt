import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Metrics } from "@/components/landing/metrics";
import { UseCases } from "@/components/landing/use-cases";
import { Testimonials } from "@/components/landing/testimonials";
import { Analytics } from "@/components/landing/analytics";
import { How } from "@/components/landing/how";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Free Online Screen Recorder & Video Sharing",
  description:
    "Record your screen and share it with one click. Screenbolt is a free, fast, and easy online screen recorder for HD screen capture and instant video sharing. Start recording in seconds.",
  alternates: {
    canonical: "https://screenbolt.com/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Screenbolt",
  description: "Record your screen and share it in seconds. The fastest way to record your screen and share it with anyone.",
  url: "https://screenbolt.com",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <Hero />
        <Metrics />
        <UseCases />
        <Testimonials />
        <Analytics />
        <How />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
