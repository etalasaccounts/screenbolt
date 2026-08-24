/**
 * Shared video utilities that multiple layers need.
 * Domain logic that should not be duplicated across services and routes.
 */

export function generateVideoTitleWithTimestamp(userTimestamp?: string): string {
  const now = userTimestamp ? new Date(userTimestamp) : new Date();
  const timestamp = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Recording — ${timestamp}`;
}

/**
 * Time-saved reporting.
 *
 * The value Screenbolt sells is the meeting that didn't happen, so the headline
 * metric is time saved rather than raw views:
 *
 *   time saved = video duration x number of people who watched it
 *
 * Only viewers other than the owner count. Recording a 5-minute video costs the
 * owner the same 5 minutes the live meeting would have, so the owner saves
 * roughly nothing; everyone else saves the whole duration, because they would
 * have had to sit through it live. Excluding the owner also means re-watching
 * your own video cannot inflate the number -- a metric you can pump without
 * doing any real work is a metric nobody trusts.
 *
 * Repeat views are already collapsed upstream (recordVideoView keeps one row per
 * person per video), which is exactly the denominator this metric wants: one
 * person watching ten times did not avoid ten meetings.
 *
 * This is an estimate, not a measurement, and it errs low on purpose -- no
 * padding for scheduling overhead or meeting small talk. Always surface it
 * labelled as an estimate.
 */
export const TIME_SAVED_WINDOW_DAYS = 90;

export interface TimeSavedView {
  userId: string | null;
  viewedAt: Date | string;
}

export interface TimeSavedVideo {
  duration: number | null;
  userId: string;
  videoViews: TimeSavedView[];
}

export interface TimeSaved {
  /** Kept in seconds: rounding to whole minutes here threw away short clips
   *  entirely, and a 40-second recording someone actually watched is a real
   *  saving. The display layer decides how to phrase it. */
  seconds: number;
  videoCount: number;
  windowDays: number;
}

/**
 * How many people other than the owner have watched. Anonymous viewers (no
 * userId, identified only by session) are external by definition.
 */
export function countExternalViewers(
  views: TimeSavedView[],
  ownerId: string,
  since?: Date,
): number {
  return views.filter((view) => {
    if (view.userId === ownerId) return false;
    if (!since) return true;
    const viewedAt = view.viewedAt instanceof Date ? view.viewedAt : new Date(view.viewedAt);
    return viewedAt.getTime() >= since.getTime();
  }).length;
}

export function calculateTimeSaved(videos: TimeSavedVideo[], now: Date = new Date()): TimeSaved {
  const since = new Date(now.getTime() - TIME_SAVED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let seconds = 0;
  let videoCount = 0;

  for (const video of videos) {
    // A video whose duration was never recorded can't be turned into minutes, so
    // it sits the metric out rather than contributing a silent zero.
    if (!video.duration) continue;

    const viewers = countExternalViewers(video.videoViews, video.userId, since);
    if (viewers === 0) continue;

    seconds += video.duration * viewers;
    videoCount += 1;
  }

  return { seconds, videoCount, windowDays: TIME_SAVED_WINDOW_DAYS };
}
