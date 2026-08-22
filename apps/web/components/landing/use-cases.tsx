import Image from "next/image";
import { Icon } from "@iconify/react";
import { Reveal } from "./reveal";

export function UseCases() {
  return (
    <section
      id="usecases"
      className="overflow-hidden bg-[#f5f5f2] px-5 py-20 md:px-12"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-5 bg-[#090b0c]/60" />
              <p className="text-xs font-normal uppercase tracking-[0.16rem] text-[#090b0c]/50">
                CORE FEATURES
              </p>
            </div>
            <Reveal y={30} blur={12} duration={800}>
              <h2 className="m-0 text-[#090b0c]">
                <span className="block text-[3rem] font-normal leading-[0.94] tracking-tight md:text-[4.5rem]">
                  Record, edit,
                </span>
                <span className="block font-serif-italic text-[3rem] leading-[0.94] tracking-tight md:text-[4.5rem]">
                  and share.
                </span>
              </h2>
            </Reveal>
          </div>
          <Reveal y={20} blur={8} delay={150} duration={800}>
            <p className="max-w-xs text-sm font-normal leading-6 text-[#090b0c]/55 md:text-right">
              Everything you need to capture, polish, and share — without a
              meeting.
            </p>
          </Reveal>
        </div>

        <div className="grid gap-4 lg:min-h-[36rem] lg:grid-cols-[2.3fr_1fr_1fr]">
          <Reveal
            y={30}
            duration={700}
            className="relative min-h-[28rem] overflow-hidden rounded-3xl p-7 lg:min-h-0"
          >
            <article className="contents">
              <Image
                src="/grass-artwork.webp"
                alt=""
                fill
                className="absolute inset-0 z-0 object-cover"
              />
              <div className="absolute inset-0 z-[1] bg-black/30" />

              <Image
                src="/artwork-korean-women.webp"
                alt=""
                width={210}
                height={230}
                className="absolute left-6 top-[56px] z-[2] h-[145px] w-[130px] rounded-2xl object-cover object-top shadow-2xl lg:left-10 lg:top-[58px] lg:h-[230px] lg:w-[210px]"
              />

              <div className="absolute right-6 top-[calc(48%+40px)] z-[3] flex items-center gap-2 lg:right-10">
                <div className="flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 backdrop-blur-md" style={{ background: "rgba(255,255,255,.15)" }}>
                  <Image src="/logo.svg" alt="" width={24} height={24} className="h-[22px] w-auto lg:h-[24px]" />
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-full text-white backdrop-blur-md lg:h-10 lg:w-10" style={{ background: "rgba(255,255,255,.15)" }}>
                  <Icon icon="solar:arrow-right-up-linear" style={{ fontSize: "1rem" }} />
                </button>
              </div>

              <div
                className="absolute left-1/2 top-[48%] z-[3] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full py-2 pl-3 pr-2 shadow-2xl backdrop-blur-md lg:gap-2 lg:py-2.5 lg:pl-4 lg:pr-2.5"
                style={{ background: "rgba(255,255,255,.95)" }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: "#ff3b30", animation: "recPulse 1.6s ease-in-out infinite" }}
                />
                <span className="text-[0.8125rem] font-normal leading-none tracking-tight text-black tabular-nums">
                  0:42
                </span>
                <span className="mx-1 h-5 w-px bg-black/10" />
                {(["videocamera", "microphone", "monitor"] as const).map((icon) => (
                  <button
                    key={icon}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-black/65 transition-colors hover:bg-black/5 lg:h-9 lg:w-9"
                  >
                    <Icon icon={`solar:${icon}-linear`} style={{ fontSize: "1.0625rem" }} />
                  </button>
                ))}
                <button className="hidden h-8 w-8 items-center justify-center rounded-full text-black/65 transition-colors hover:bg-black/5 lg:flex lg:h-9 lg:w-9">
                  <Icon icon="solar:settings-linear" style={{ fontSize: "1.0625rem" }} />
                </button>
                <span className="mx-1 h-5 w-px bg-black/10" />
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff3b30] lg:h-9 lg:w-9">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-white" />
                </button>
              </div>

              <div className="absolute bottom-7 left-7 right-7 z-[2]">
                <p className="mb-3 text-xs font-normal uppercase tracking-[0.16rem] text-white/60">
                  Record
                </p>
                <h3 className="max-w-xl text-[1.75rem] font-normal leading-tight tracking-tight text-white md:text-4xl">
                  Capture your screen in seconds.
                </h3>
                <p className="mt-4 max-w-md text-[0.875rem] font-normal leading-6 text-white/65">
                  Record your screen, camera, and voice in one click — no
                  downloads, no setup.
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal
            y={30}
            delay={100}
            duration={700}
            className="relative min-h-[20rem] overflow-hidden rounded-3xl p-7 lg:min-h-0"
          >
            <Image src="/artwork-savana-horse.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
            <div className="absolute inset-0 z-[1] bg-black/30" />
            <div className="absolute bottom-7 left-7 right-7 z-[2]">
              <Icon icon="solar:scissors-linear" className="mb-8 text-white/75" style={{ fontSize: "2rem" }} />
              <p className="mb-3 text-xs font-normal uppercase tracking-[0.16rem] text-white/65">Edit</p>
              <h3 className="text-2xl font-normal leading-tight tracking-tight text-white">
                Cut the unwanted
              </h3>
            </div>
          </Reveal>

          <Reveal
            y={30}
            delay={200}
            duration={700}
            className="relative min-h-[20rem] overflow-hidden rounded-3xl p-7 lg:min-h-0"
          >
            <Image src="/artwork-paper-plan.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
            <div className="absolute inset-0 z-[1] bg-black/30" />
            <div className="absolute bottom-7 left-7 right-7 z-[2]">
              <Icon icon="solar:share-linear" className="mb-8 text-white/75" style={{ fontSize: "2rem" }} />
              <p className="mb-3 text-xs font-normal uppercase tracking-[0.16rem] text-white/65">Share</p>
              <h3 className="text-2xl font-normal leading-tight tracking-tight text-white">
                A link is all it takes.
              </h3>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
