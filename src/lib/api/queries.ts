'use client';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from './client';
import type {
  ActivityView,
  Bootstrap,
  DailyReviewView,
  DeliveryView,
  InvitationView,
  JournalEntryView,
  MeView,
  OverviewMetrics,
  ProjectSummary,
  ReportMetrics,
  RepositoryView,
  TaskDetail,
  TaskSummary,
  TimeRecord,
  TimerState,
  WeeklyGoalView,
} from './types';

type Query = Record<string, string | number | boolean | undefined | null>;

export const keys = {
  bootstrap: ['bootstrap'] as const,
  me: ['me'] as const,
  tasks: (query: Query) => ['tasks', query] as const,
  task: (id: string) => ['task', id] as const,
  projects: (query: Query) => ['projects', query] as const,
  timer: ['timer'] as const,
  timeRecords: (query: Query) => ['time', 'records', query] as const,
  activity: (query: Query) => ['activity', query] as const,
  overview: (query: Query) => ['analytics', 'overview', query] as const,
  report: (query: Query) => ['analytics', 'report', query] as const,
  journal: (query: Query) => ['journal', query] as const,
  journalEntry: (id: string) => ['journal-entry', id] as const,
  goals: (query: Query) => ['goals', query] as const,
  review: (query: Query) => ['review', query] as const,
  repositories: (query: Query) => ['repositories', query] as const,
  deliveries: (query: Query) => ['deliveries', query] as const,
  invitations: ['invitations'] as const,
};

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function useBootstrap(options?: Partial<UseQueryOptions<Bootstrap>>) {
  return useQuery<Bootstrap>({
    queryKey: keys.bootstrap,
    queryFn: () => api.get<Bootstrap>('/bootstrap'),
    staleTime: 60_000,
    ...options,
  });
}

export function useMe() {
  return useQuery<MeView>({ queryKey: keys.me, queryFn: () => api.get<MeView>('/me') });
}

export function useTasks(query: Query, enabled = true) {
  return useQuery<{ items: TaskSummary[]; total: number }>({
    queryKey: keys.tasks(query),
    queryFn: () => api.get('/tasks', query),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useTask(id: string | null) {
  return useQuery<TaskDetail>({
    queryKey: keys.task(id ?? ''),
    queryFn: () => api.get(`/tasks/${id}`),
    enabled: Boolean(id),
  });
}

export function useProjects(query: Query = {}) {
  return useQuery<ProjectSummary[]>({
    queryKey: keys.projects(query),
    queryFn: () => api.get('/projects', query),
  });
}

export function useTimer() {
  return useQuery<TimerState>({
    queryKey: keys.timer,
    queryFn: () => api.get('/time/timer'),
    staleTime: 10_000,
    refetchInterval: 60_000,
  });
}

export function useTimeRecords(query: Query) {
  return useQuery<TimeRecord[]>({
    queryKey: keys.timeRecords(query),
    queryFn: () => api.get('/time/entries', query),
    placeholderData: (previous) => previous,
  });
}

export function useActivity(query: Query) {
  return useQuery<{ items: ActivityView[]; total: number }>({
    queryKey: keys.activity(query),
    queryFn: () => api.get('/activity', query),
    placeholderData: (previous) => previous,
  });
}

export function useOverview(query: Query) {
  return useQuery<OverviewMetrics>({
    queryKey: keys.overview(query),
    queryFn: () => api.get('/analytics/overview', query),
    placeholderData: (previous) => previous,
  });
}

export function useReport(query: Query) {
  return useQuery<ReportMetrics>({
    queryKey: keys.report(query),
    queryFn: () => api.get('/analytics/report', query),
    placeholderData: (previous) => previous,
  });
}

export function useJournal(query: Query) {
  return useQuery<{ items: JournalEntryView[]; total: number }>({
    queryKey: keys.journal(query),
    queryFn: () => api.get('/journal', query),
    placeholderData: (previous) => previous,
  });
}

export function useGoals(query: Query) {
  return useQuery<{ weekStart: string; goals: WeeklyGoalView[] }>({
    queryKey: keys.goals(query),
    queryFn: () => api.get('/goals', query),
  });
}

export function useDailyReview(query: { date: string; workspaceId?: string }) {
  return useQuery<DailyReviewView | null>({
    queryKey: keys.review(query),
    queryFn: () => api.get('/reviews', query),
  });
}

export function useRepositories(query: Query = {}) {
  return useQuery<RepositoryView[]>({
    queryKey: keys.repositories(query),
    queryFn: () => api.get('/repositories', query),
  });
}

export function useDeliveries(query: Query = {}) {
  return useQuery<DeliveryView[]>({
    queryKey: keys.deliveries(query),
    queryFn: () => api.get('/deliveries', query),
    placeholderData: (previous) => previous,
  });
}

export function useInvitations(enabled: boolean) {
  return useQuery<InvitationView[]>({
    queryKey: keys.invitations,
    queryFn: () => api.get('/invitations'),
    enabled,
  });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

/** Query key prefixes refreshed after a given kind of change. */
const affected = {
  tasks: [['tasks'], ['task'], ['bootstrap'], ['analytics'], ['activity'], ['timer'], ['projects']],
  projects: [['projects'], ['tasks'], ['task'], ['bootstrap'], ['activity'], ['analytics']],
  workspaces: [
    ['bootstrap'],
    ['tasks'],
    ['projects'],
    ['activity'],
    ['analytics'],
    ['goals'],
    ['repositories'],
  ],
  timer: [['timer'], ['tasks'], ['task'], ['time'], ['analytics'], ['activity'], ['bootstrap']],
  time: [['time'], ['task'], ['analytics'], ['activity']],
  journal: [['journal'], ['journal-entry'], ['activity']],
  goals: [['goals'], ['activity'], ['analytics']],
  review: [['review'], ['activity']],
  repositories: [['repositories'], ['task'], ['activity'], ['deliveries']],
  deliveries: [['deliveries'], ['task'], ['analytics'], ['activity']],
  settings: [['bootstrap'], ['me'], ['analytics']],
  invitations: [['invitations']],
};
type Affected = keyof typeof affected;

/**
 * Generic mutation hook: runs the request, then invalidates every query family
 * that the change could have touched. Simpler than hand-maintained cache
 * surgery and always consistent with the server.
 */
export function useApiMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  scope: Affected | Affected[],
  options: { onSuccess?: (data: TOutput, input: TInput) => void } = {},
) {
  const client = useQueryClient();
  const scopes = Array.isArray(scope) ? scope : [scope];
  return useMutation<TOutput, Error, TInput>({
    mutationFn,
    onSuccess: async (data, input) => {
      options.onSuccess?.(data, input);
      const prefixes = new Set(scopes.flatMap((name) => affected[name]).map((key) => key[0]));
      await Promise.all(
        [...prefixes].map((prefix) => client.invalidateQueries({ queryKey: [prefix] })),
      );
    },
  });
}

export function useInvalidate() {
  const client = useQueryClient();
  return (scope: Affected | Affected[]) => {
    const scopes = Array.isArray(scope) ? scope : [scope];
    const prefixes = new Set(scopes.flatMap((name) => affected[name]).map((key) => key[0]));
    return Promise.all(
      [...prefixes].map((prefix) => client.invalidateQueries({ queryKey: [prefix] })),
    );
  };
}
