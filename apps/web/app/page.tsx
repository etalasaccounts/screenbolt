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

export default function Home() {
  return (
    <>
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
