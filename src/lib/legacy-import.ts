import { z } from 'zod';

/**
 * Structure of the browser-local design prototype (localStorage key
 * `daymark.design.v1`). Kept only to migrate that data into an account.
 */
export const LEGACY_STORAGE_KEY = 'daymark.design.v1';

const legacyWorkspace = z.enum(['Office', 'Personal', 'Learning']);
const finite = z.number().finite().min(0);
const legacyTask = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000),
  workspace: legacyWorkspace,
  project: z.string().max(120),
  status: z.enum(['planned', 'active', 'blocked', 'done']),
  priority: z.enum(['High', 'Medium', 'Low']),
  phase: z.string().max(60),
  estimate: finite.max(100000),
  date: z.iso.date(),
});

export const legacyStateSchema = z
  .object({
    version: z.literal(1),
    projects: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1).max(120),
          workspace: legacyWorkspace,
          description: z.string().max(2000),
          archived: z.boolean(),
        }),
      )
      .optional(),
    tasks: z.array(legacyTask).max(5000),
    activities: z
      .array(
        z.object({
          id: z.string(),
          title: z.string().max(500),
          detail: z.string().max(1000),
          time: finite,
          workspace: legacyWorkspace,
          taskId: z.string().optional(),
        }),
      )
      .max(20000),
    timer: z
      .object({ taskId: z.string(), accumulated: finite, startedAt: finite.nullable() })
      .nullable(),
    sessions: z
      .array(
        z.object({
          id: z.string(),
          taskId: z.string(),
          seconds: finite.max(86400),
          endedAt: finite,
        }),
      )
      .max(20000),
    journal: z.string().max(100000),
    goals: z.array(z.boolean()),
  })
  .superRefine((state, ctx) => {
    const ids = new Set(state.tasks.map((t) => t.id));
    if (ids.size !== state.tasks.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate task identifiers.' });
    for (const session of state.sessions) {
      if (!ids.has(session.taskId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'A session references a task that does not exist.',
        });
        break;
      }
    }
  });
export type LegacyState = z.infer<typeof legacyStateSchema>;

/** Titles of the built-in fictional sample tasks shipped with the prototype. */
const sampleTitles = new Set([
  'Build the workspace switcher',
  'Review authentication flow',
  'Read a chapter of Designing Data-Intensive Applications',
  'Plan meals for the week',
  'Set up the project foundation',
  'Morning mobility & stretch',
]);

export const legacyStatusKey = {
  planned: 'planned',
  active: 'in_progress',
  blocked: 'blocked',
  done: 'completed',
} as const;

const legacyPhaseKeys: Record<string, string[]> = {
  Planning: ['technical_planning', 'planning'],
  Development: ['development', 'in_progress'],
  'Code review': ['code_review', 'review'],
  'QA / Testing': ['qa_testing', 'review'],
  Deployment: ['deployment'],
  Verification: ['production_verification', 'completed'],
};

export function legacyPhaseCandidates(phase: string): string[] {
  return legacyPhaseKeys[phase] ?? [];
}

export type LegacyPreview = {
  tasks: number;
  projects: number;
  sessions: number;
  trackedSeconds: number;
  activities: number;
  hasJournal: boolean;
  workspaces: string[];
  /** True when the data is the untouched built-in sample. */
  looksLikeSample: boolean;
  /** Sample tasks are fictional; they are only imported when explicitly requested. */
  sampleTaskCount: number;
};

export function previewLegacy(state: LegacyState): LegacyPreview {
  const projectNames = new Set<string>();
  for (const p of state.projects ?? []) projectNames.add(`${p.workspace}|${p.name}`);
  for (const t of state.tasks)
    if (t.project.trim()) projectNames.add(`${t.workspace}|${t.project}`);
  const sampleTaskCount = state.tasks.filter(
    (t) => sampleTitles.has(t.title) && /^DM-1\d\d$/.test(t.id),
  ).length;
  return {
    tasks: state.tasks.length,
    projects: projectNames.size,
    sessions: state.sessions.length,
    trackedSeconds: state.sessions.reduce((n, s) => n + s.seconds, 0),
    activities: state.activities.length,
    hasJournal: state.journal.trim().length > 0,
    workspaces: [...new Set(state.tasks.map((t) => t.workspace))],
    looksLikeSample:
      sampleTaskCount === state.tasks.length && state.tasks.length > 0 && !state.journal.trim(),
    sampleTaskCount,
  };
}

/** Stable fingerprint so the same local data is never imported twice. */
export function legacyFingerprintSource(state: LegacyState): string {
  return JSON.stringify({
    tasks: state.tasks.map((t) => [t.id, t.title, t.date]).sort(),
    sessions: state.sessions.map((s) => [s.id, s.seconds, s.endedAt]).sort(),
    journal: state.journal,
  });
}

export function isSampleTask(task: { id: string; title: string }): boolean {
  return sampleTitles.has(task.title) && /^DM-1\d\d$/.test(task.id);
}
