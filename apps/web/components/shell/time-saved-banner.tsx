"use client";

import Image from "next/image";
import { Icon } from "@iconify/react";

export interface TimeSaved {
  seconds: number;
  videoCount: number;
  windowDays: number;
}

function formatSaved(totalSeconds: number): string {
  // Short recordings are the normal case early on, so say "40 seconds" rather
  // than rounding an honest number down to "0 minutes".
  if (totalSeconds < 60) {
    const secs = Math.round(totalSeconds);
    return `${secs} second${secs === 1 ? "" : "s"}`;
  }

  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hoursLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  return rest === 0 ? hoursLabel : `${hoursLabel} ${rest} min`;
}

function formatWindow(days: number): string {
  const months = Math.round(days / 30);
  return months >= 1 ? `${months} month${months === 1 ? "" : "s"}` : `${days} days`;
}

/**
 * Time saved is the reason people record instead of meeting, so it leads the
 * video library.
 *
 * It stays hidden until someone other than the owner has actually watched
 * something -- that empty state sells nothing. The bar is "nobody watched", not
 * "the saving was small": a real 30-second saving still proves the feature
 * works, and hiding it looks like a bug. And it says "estimated" out loud,
 * because it is an estimate (video length x viewers, see lib/shared/video.ts);
 * a big number with no stated basis is the kind of thing users stop believing
 * the moment they think about it.
 */
export function TimeSavedBanner({ timeSaved }: { timeSaved: TimeSaved }) {
  if (timeSaved.videoCount === 0 || timeSaved.seconds <= 0) return null;

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl">
      {/* Same treatment as the landing page's "Capture your screen in seconds"
          card: the grass artwork under a black/30 wash, which is what keeps the
          white type readable over the photo. */}
      <Image src="/grass-artwork.webp" alt="" fill className="absolute inset-0 z-0 object-cover" />
      <div className="absolute inset-0 z-[1] bg-black/30" />

      <div className="relative z-[2] flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
            <Icon icon="solar:alarm-linear" style={{ fontSize: "1.375rem" }} className="text-white/85" />
          </div>
          <div>
            <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-white/60">
              In the past {formatWindow(timeSaved.windowDays)}
            </p>
            <p className="mt-1 text-[1.375rem] font-normal leading-tight tracking-tight text-white">
              You saved <span className="font-serif-italic">{formatSaved(timeSaved.seconds)}</span> of
              live meetings
            </p>
          </div>
        </div>
        <p
          className="max-w-xs text-[0.8125rem] leading-5 text-white/65 sm:text-right"
          title="Estimated as video length × the number of people who watched it, counting everyone except you. The same person watching twice counts once."
        >
          Estimated · {timeSaved.videoCount} watched{" "}
          {timeSaved.videoCount === 1 ? "recording" : "recordings"}
        </p>
      </div>
    </div>
  );
}
