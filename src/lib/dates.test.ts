import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateInTimezone,
  diffDays,
  eachDay,
  endOfMonth,
  formatDuration,
  rangeForPeriod,
  startOfWeek,
} from './dates';

describe('calendar helpers', () => {
  it('computes the local date of an instant per timezone', () => {
    const instant = new Date('2026-11-05T22:30:00Z');
    expect(dateInTimezone(instant, 'UTC')).toBe('2026-11-05');
    expect(dateInTimezone(instant, 'Asia/Kolkata')).toBe('2026-11-06');
    expect(dateInTimezone(instant, 'America/Los_Angeles')).toBe('2026-11-05');
  });
  it('adds days across month and year boundaries without timezone drift', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-01', '2026-11-08')).toBe(7);
  });
  it('respects the configured week start', () => {
    expect(startOfWeek('2026-11-05', 1)).toBe('2026-11-02');
    expect(startOfWeek('2026-11-05', 0)).toBe('2026-11-01');
    expect(rangeForPeriod('week', '2026-11-05', 1)).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
    expect(rangeForPeriod('month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(endOfMonth('2028-02-03')).toBe('2028-02-29');
  });
  it('lists every day in a range', () => {
    expect(eachDay('2026-11-29', '2026-12-02')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
  });
  it('formats durations', () => {
    expect(formatDuration(3723)).toBe('01:02:03');
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});
