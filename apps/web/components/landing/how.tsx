import { Reveal } from "./reveal";

const STEPS = [
  { n: "01", title: "Record", body: "Capture your screen, camera, and voice in one click." },
  { n: "02", title: "Edit", body: "Trim, add chapters, and remove filler words automatically." },
  { n: "03", title: "Share", body: "Copy a link and drop it anywhere — no downloads, no accounts." },
  { n: "04", title: "Get feedback", body: "See who watched, and collect comments right on the video." },
];

export function How() {
  return (
    <section id="how" className="overflow-hidden bg-[#f5f5f2] px-5 py-20 md:px-12">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-16">
          <div className="mb-4 text-[0.75rem] font-normal uppercase tracking-[0.125rem] text-[#090b0c]/50">
            HOW IT WORKS
          </div>
          <Reveal y={30} blur={12} duration={800}>
            <h2 className="m-0 text-[#090b0c]">
              <span className="block text-[3.5rem] font-normal leading-none tracking-tight md:text-[4.5rem]">
                From record to
              </span>
              <span className="block font-serif-italic text-[3.5rem] leading-none tracking-tight md:text-[4.5rem]">
                feedback in seconds
              </span>
            </h2>
          </Reveal>
        </div>

        <div>
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              y={30}
              delay={i * 80}
              duration={700}
              className={`grid gap-5 py-9 md:grid-cols-[0.45fr_1fr_1fr] ${
                i === STEPS.length - 1 ? "border-y" : "border-t"
              } border-black/15`}
            >
              <span className="font-serif-italic text-4xl text-[#090b0c]/40">{step.n}</span>
              <h3 className="text-[1.75rem] font-normal tracking-tight text-[#090b0c]">{step.title}</h3>
              <p className="max-w-md text-[0.9375rem] font-normal leading-6 text-[#090b0c]/50">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
