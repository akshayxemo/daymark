import { describe, expect, it } from 'vitest';
import { elapsedSeconds, formatSeconds } from './engine';

const at = (s: string) => new Date(`2026-11-05T${s}Z`);

describe('timer calculations', () => {
  it('sums closed intervals and excludes paused gaps', () => {
    const intervals = [
      { startedAt: at('09:00:00'), endedAt: at('09:25:00') },
      { startedAt: at('10:00:00'), endedAt: at('10:05:30') },
    ];
    expect(elapsedSeconds(intervals, at('12:00:00'))).toBe(30 * 60 + 30);
  });
  it('measures an open interval up to now', () => {
    expect(elapsedSeconds([{ startedAt: at('09:00:00'), endedAt: null }], at('09:10:00'))).toBe(
      600,
    );
  });
  it('never counts negative time when the clock is behind the start', () => {
    expect(elapsedSeconds([{ startedAt: at('09:00:00'), endedAt: null }], at('08:59:00'))).toBe(0);
  });
  it('formats short and long durations', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(125)).toBe('2m 5s');
    expect(formatSeconds(3720)).toBe('1h 2m');
  });
});
