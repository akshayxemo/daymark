'use client';
import { api } from '@/lib/api/client';
import { useApiMutation, useTimer } from '@/lib/api/queries';
import type { TimerState } from '@/lib/api/types';
import { useApp } from './context';

/** Timer controls shared by the focus card, the floating timer and the task drawer. */
export function useTimerActions() {
  const { toast } = useApp();
  const timer = useTimer();
  const start = useApiMutation(
    (input: { taskId: string; phaseId?: string | null; description?: string }) =>
      api.post<TimerState>('/time/timer/start', input),
    'timer',
    { onSuccess: () => toast('Focus session started') },
  );
  const pause = useApiMutation(() => api.post<TimerState>('/time/timer/pause'), 'timer');
  const resume = useApiMutation(() => api.post<TimerState>('/time/timer/resume'), 'timer');
  const stop = useApiMutation(
    (input: { description?: string } = {}) =>
      api.post<{ state: TimerState }>('/time/timer/stop', input),
    'timer',
    { onSuccess: () => toast('Focus session saved to time tracking') },
  );
  const cancel = useApiMutation(() => api.post<TimerState>('/time/timer/cancel'), 'timer', {
    onSuccess: () => toast('Timer discarded'),
  });
  const busy =
    start.isPending || pause.isPending || resume.isPending || stop.isPending || cancel.isPending;
  return {
    state: timer.data,
    isLoading: timer.isLoading,
    busy,
    start: (taskId: string, extra?: { phaseId?: string | null; description?: string }) =>
      start.mutate({ taskId, ...extra }),
    pause: () => pause.mutate(undefined),
    resume: () => resume.mutate(undefined),
    toggle: () =>
      timer.data?.active?.status === 'running' ? pause.mutate(undefined) : resume.mutate(undefined),
    stop: (description?: string) => stop.mutate(description ? { description } : {}),
    cancel: () => cancel.mutate(undefined),
  };
}
