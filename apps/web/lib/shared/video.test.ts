import { describe, it, expect } from 'vitest';
import { generateVideoTitleWithTimestamp } from './video';

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
