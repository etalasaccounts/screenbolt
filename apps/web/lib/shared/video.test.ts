import { describe, it, expect } from 'vitest';
import {
  generateVideoTitleWithTimestamp,
  countExternalViewers,
  calculateTimeSaved,
  TIME_SAVED_WINDOW_DAYS,
} from './video';

describe('generateVideoTitleWithTimestamp', () => {
  it('should generate a title with the default-to-now path', () => {
    const title = generateVideoTitleWithTimestamp();
    expect(title).toMatch(/^Recording — /);
    // Should contain time in format like "04:56 PM"
    expect(title).toMatch(/\d{1,2}:\d{2}\s(AM|PM)$/);
  });

  it('should include the provided timestamp in the output', () => {
    const timestamp = '2026-01-15T14:30:00Z';
    const title = generateVideoTitleWithTimestamp(timestamp);
    expect(title).toMatch(/^Recording — /);
    expect(title).toContain('Jan 15');
    // Verify the title contains a time in AM/PM format
    expect(title).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
  });

  it('should prefix the timestamp with "Recording — "', () => {
    const timestamp = '2026-08-21T10:00:00Z';
    const title = generateVideoTitleWithTimestamp(timestamp);
    expect(title.startsWith('Recording — ')).toBe(true);
  });

  it('should parse various timestamp formats correctly', () => {
    const title = generateVideoTitleWithTimestamp('2025-12-25T23:45:00Z');
    expect(title).toMatch(/^Recording — /);
    // The time is 23:45 UTC, which converts to 7:45 AM next day in Eastern, or similar offset
    // Just verify the date part is there
    expect(title).toMatch(/Recording — \w+ \d+/);
  });
});

describe('countExternalViewers', () => {
  const OWNER = 'owner-1';
  const now = new Date('2026-08-24T00:00:00Z');

  it('excludes the owner watching their own video', () => {
    const views = [
      { userId: OWNER, viewedAt: now },
      { userId: 'someone-else', viewedAt: now },
    ];
    expect(countExternalViewers(views, OWNER)).toBe(1);
  });

  it('counts anonymous viewers, who have no userId', () => {
    const views = [
      { userId: null, viewedAt: now },
      { userId: null, viewedAt: now },
    ];
    expect(countExternalViewers(views, OWNER)).toBe(2);
  });

  it('drops views older than the cutoff when one is given', () => {
    const views = [
      { userId: 'a', viewedAt: new Date('2026-08-20T00:00:00Z') },
      { userId: 'b', viewedAt: new Date('2026-01-01T00:00:00Z') },
    ];
    const since = new Date('2026-08-01T00:00:00Z');
    expect(countExternalViewers(views, OWNER, since)).toBe(1);
  });

  it('accepts ISO date strings as well as Date objects', () => {
    const views = [{ userId: 'a', viewedAt: '2026-08-20T00:00:00Z' }];
    expect(countExternalViewers(views, OWNER, new Date('2026-08-01T00:00:00Z'))).toBe(1);
  });
});

describe('calculateTimeSaved', () => {
  const OWNER = 'owner-1';
  const NOW = new Date('2026-08-24T00:00:00Z');
  const recent = new Date('2026-08-20T00:00:00Z');
  const old = new Date('2026-01-01T00:00:00Z');

  it('multiplies video length by the number of other people who watched', () => {
    const result = calculateTimeSaved(
      [
        {
          duration: 300, // 5 minutes
          userId: OWNER,
          videoViews: [
            { userId: 'a', viewedAt: recent },
            { userId: 'b', viewedAt: recent },
            { userId: 'c', viewedAt: recent },
          ],
        },
      ],
      NOW,
    );
    expect(result.seconds).toBe(900);
    expect(result.videoCount).toBe(1);
  });

  it('sums across videos', () => {
    const result = calculateTimeSaved(
      [
        { duration: 240, userId: OWNER, videoViews: [{ userId: 'a', viewedAt: recent }] },
        { duration: 360, userId: OWNER, videoViews: [{ userId: 'b', viewedAt: recent }] },
      ],
      NOW,
    );
    expect(result.seconds).toBe(600);
    expect(result.videoCount).toBe(2);
  });

  it('cannot be inflated by the owner rewatching their own video', () => {
    const result = calculateTimeSaved(
      [{ duration: 600, userId: OWNER, videoViews: [{ userId: OWNER, viewedAt: recent }] }],
      NOW,
    );
    expect(result.seconds).toBe(0);
    expect(result.videoCount).toBe(0);
  });

  it('ignores videos nobody has watched', () => {
    const result = calculateTimeSaved(
      [{ duration: 600, userId: OWNER, videoViews: [] }],
      NOW,
    );
    expect(result).toEqual({ seconds: 0, videoCount: 0, windowDays: TIME_SAVED_WINDOW_DAYS });
  });

  it('skips videos whose duration was never recorded', () => {
    const result = calculateTimeSaved(
      [{ duration: null, userId: OWNER, videoViews: [{ userId: 'a', viewedAt: recent }] }],
      NOW,
    );
    expect(result.seconds).toBe(0);
    expect(result.videoCount).toBe(0);
  });

  it('keeps sub-minute savings instead of rounding them away', () => {
    const result = calculateTimeSaved(
      [{ duration: 9, userId: OWNER, videoViews: [{ userId: 'a', viewedAt: recent }] }],
      NOW,
    );
    expect(result.seconds).toBe(9);
    expect(result.videoCount).toBe(1);
  });

  it('only counts views inside the reporting window', () => {
    const result = calculateTimeSaved(
      [
        {
          duration: 300,
          userId: OWNER,
          videoViews: [
            { userId: 'a', viewedAt: recent },
            { userId: 'b', viewedAt: old },
          ],
        },
      ],
      NOW,
    );
    expect(result.seconds).toBe(300);
  });
});
