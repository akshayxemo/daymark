'use client';
import { useEffect, useState } from 'react';
import type { TimerState } from '@/lib/api/types';

/**
 * Derives the seconds to display from the server's elapsed value and the
 * instant it was computed. The browser only advances the display; the
 * authoritative value always comes from the server.
 */
export function useTimerClock(state: TimerState | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  const running = state?.active?.status === 'running';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!state?.active) return 0;
  if (!running) return state.active.elapsedSeconds;
  const drift = Math.max(0, Math.floor((now - new Date(state.serverTime).getTime()) / 1000));
  return state.active.elapsedSeconds + drift;
}
