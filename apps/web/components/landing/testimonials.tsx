import { Reveal } from "./reveal";
import { TestimonialCarousel } from "./testimonial-carousel";
import { SmartCards } from "./smart-cards";

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-[#f5f5f2] px-5 pt-28 pb-20 md:px-12 md:pt-40 md:pb-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 74% 64% at 50% 36%,rgba(0,0,0,.09),rgba(0,0,0,.03) 45%,transparent 72%)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px]">
        <Reveal
          y={30}
          blur={12}
          duration={900}
          className="relative mx-auto max-w-4xl text-center"
        >
          <div className="mb-8 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
            WHAT PEOPLE SAY
          </div>
          <TestimonialCarousel />
        </Reveal>

        <SmartCards />
      </div>
    </section>
  );
}
