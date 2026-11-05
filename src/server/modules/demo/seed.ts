import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@/server/db/client';
import {
  activityEvents,
  taskStatusHistory,
  tasks,
  user,
  workSessionIntervals,
  workSessions,
} from '@/server/db/schema';
import type { Auth } from '@/server/auth/auth';
import { addDays } from '@/lib/dates';
import {
  createRepository,
  addTaskRepository,
  addReference,
  recordDelivery,
} from '../development/service';
import { createJournalEntry, createWeeklyGoal, upsertDailyReview } from '../journal/service';
import { createProject } from '../projects/service';
import { changeTaskPhase, changeTaskStatus, createTask, planTask } from '../tasks/service';
import { createTimeEntry } from '../time/service';
import { createWorkspace, getWorkspaceConfiguration } from '../workspaces/service';
import { startOfWeek } from '@/lib/dates';
import { markOnboardingComplete } from '../users/service';

/**
 * Fictional demonstration data for development and screenshots. Everything
 * here is invented: no real people, employers or projects. Never run this
 * against a production database.
 */

export const DEMO_EMAIL = 'demo@daymark.local';
export const DEMO_NAME = 'Daymark Demo';

export type DemoOptions = {
  auth: Auth;
  today: string;
  password: string;
};

export async function seedDemoData(db: DatabaseClient, options: DemoOptions) {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, DEMO_EMAIL))
    .limit(1);
  if (existing.length) {
    return { created: false, userId: existing[0]!.id, email: DEMO_EMAIL };
  }

  const signedUp = await options.auth.api.signUpEmail({
    body: { name: DEMO_NAME, email: DEMO_EMAIL, password: options.password },
    headers: new Headers(),
  });
  const userId = signedUp.user.id;
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));

  const { today } = options;
  const day = (offset: number) => addDays(today, offset);
  const at = (offset: number, hour: number, minute = 0) =>
    new Date(
      `${day(offset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
    );

  const office = await createWorkspace(db, userId, {
    name: 'Office',
    description: 'Professional work, projects, repositories and deliveries.',
    kind: 'professional',
    icon: 'briefcase',
    color: 'accent',
  });
  const personal = await createWorkspace(db, userId, {
    name: 'Personal',
    description: 'Personal tasks, goals and life admin.',
    kind: 'personal',
    icon: 'leaf',
    color: 'purple',
  });
  const learning = await createWorkspace(db, userId, {
    name: 'Learning',
    description: 'Courses, reading and skills in progress.',
    kind: 'learning',
    icon: 'book',
    color: 'orange',
  });

  const officeConfig = await getWorkspaceConfiguration(db, userId, office.id);
  const personalConfig = await getWorkspaceConfiguration(db, userId, personal.id);
  const learningConfig = await getWorkspaceConfiguration(db, userId, learning.id);
  const statusOf = (config: typeof officeConfig, key: string) =>
    config.statuses.find((s) => s.key === key)!.id;
  const phaseOf = (config: typeof officeConfig, key: string) =>
    config.phases.find((p) => p.key === key)?.id ?? null;
  const typeOf = (config: typeof officeConfig, key: string) =>
    config.taskTypes.find((t) => t.key === key)?.id;

  const platform = await createProject(db, userId, {
    workspaceId: office.id,
    name: 'Daymark platform',
    description: 'The open-source personal work intelligence dashboard.',
    status: 'active',
  });
  const dashboard = await createProject(db, userId, {
    workspaceId: office.id,
    name: 'Provider dashboard',
    description: 'Internal reporting portal for the fictional Acme Health team.',
    status: 'active',
  });
  const lifeAdmin = await createProject(db, userId, {
    workspaceId: personal.id,
    name: 'Life admin',
    description: 'Errands, paperwork and household planning.',
    status: 'active',
  });
  const wellbeing = await createProject(db, userId, {
    workspaceId: personal.id,
    name: 'Personal wellbeing',
    description: 'Movement, rest and recovery.',
    status: 'active',
  });
  const bookshelf = await createProject(db, userId, {
    workspaceId: learning.id,
    name: 'Engineering bookshelf',
    description: 'Books and papers worth finishing this year.',
    status: 'active',
  });

  const platformRepo = await createRepository(db, userId, {
    workspaceId: office.id,
    name: 'daymark/platform',
    owner: 'daymark',
    provider: 'github',
    repositoryUrl: 'https://github.com/example/daymark-platform',
    defaultBranch: 'main',
    description: 'Next.js application and database.',
  });
  const dashboardRepo = await createRepository(db, userId, {
    workspaceId: office.id,
    name: 'acme/provider-dashboard',
    owner: 'acme',
    provider: 'gitlab',
    repositoryUrl: 'https://gitlab.com/example/provider-dashboard',
    defaultBranch: 'develop',
    description: 'Reporting portal frontend.',
  });

  // Office tasks -----------------------------------------------------------
  const foundation = await createTask(db, userId, {
    workspaceId: office.id,
    title: 'Set up the project foundation',
    description:
      'Initialize the repository, configure PostgreSQL and define the initial architecture.',
    projectId: platform.id,
    taskTypeId: typeOf(officeConfig, 'development'),
    priority: 'high',
    estimatedMinutes: 240,
    plannedDate: day(-6),
    phaseId: phaseOf(officeConfig, 'development'),
  });
  await changeTaskStatus(db, userId, foundation.id, {
    statusId: statusOf(officeConfig, 'in_progress'),
  });
  await changeTaskPhase(db, userId, foundation.id, {
    phaseId: phaseOf(officeConfig, 'code_review'),
  });
  await changeTaskPhase(db, userId, foundation.id, {
    phaseId: phaseOf(officeConfig, 'deployment'),
  });
  await changeTaskPhase(db, userId, foundation.id, {
    phaseId: phaseOf(officeConfig, 'production_verification'),
  });
  await changeTaskStatus(db, userId, foundation.id, {
    statusId: statusOf(officeConfig, 'completed'),
    reason: 'Shipped in v0.1.0',
  });
  await addTaskRepository(db, userId, foundation.id, {
    repositoryId: platformRepo.id,
    codebaseName: 'web',
    branchName: 'feature/foundation',
    branchUrl: null,
    workStatus: 'merged',
    notes: 'Squash-merged after review.',
  });
  await addReference(db, userId, foundation.id, {
    referenceType: 'jira',
    referenceId: 'DAY-101',
    title: 'Project foundation',
    url: 'https://example.atlassian.net/browse/DAY-101',
  });
  await addReference(db, userId, foundation.id, {
    referenceType: 'pull_request',
    referenceId: '#12',
    title: 'Foundation: repository and database setup',
    url: 'https://github.com/example/daymark-platform/pull/12',
  });
  await recordDelivery(db, userId, foundation.id, {
    repositoryId: platformRepo.id,
    deliveryType: 'merged',
    environment: 'development',
    deliveryStatus: 'successful',
    branchName: 'feature/foundation',
    deliveredAt: at(-4, 10).toISOString(),
    notes: '',
  });
  await recordDelivery(db, userId, foundation.id, {
    repositoryId: platformRepo.id,
    deliveryType: 'deployed',
    environment: 'uat',
    deliveryStatus: 'successful',
    version: 'v0.1.0-rc1',
    deliveredAt: at(-3, 14).toISOString(),
    notes: '',
  });
  await recordDelivery(db, userId, foundation.id, {
    repositoryId: platformRepo.id,
    deliveryType: 'deployed',
    environment: 'production',
    deliveryStatus: 'successful',
    version: 'v0.1.0',
    deliveredAt: at(-2, 9).toISOString(),
    notes: '',
  });
  await recordDelivery(db, userId, foundation.id, {
    repositoryId: platformRepo.id,
    deliveryType: 'verified',
    environment: 'production',
    deliveryStatus: 'successful',
    version: 'v0.1.0',
    deliveredAt: at(-2, 11).toISOString(),
    notes: 'Smoke tests and sign-in verified on production.',
  });

  const switcher = await createTask(db, userId, {
    workspaceId: office.id,
    title: 'Build the workspace switcher',
    description:
      'Create a unified workspace switcher with clear scope, keyboard access and saved preferences.',
    projectId: platform.id,
    taskTypeId: typeOf(officeConfig, 'development'),
    priority: 'high',
    estimatedMinutes: 120,
    plannedDate: today,
    dueDate: day(2),
    phaseId: phaseOf(officeConfig, 'development'),
  });
  await changeTaskStatus(db, userId, switcher.id, {
    statusId: statusOf(officeConfig, 'in_progress'),
  });
  await addTaskRepository(db, userId, switcher.id, {
    repositoryId: platformRepo.id,
    codebaseName: 'web',
    branchName: 'feature/workspace-switcher',
    branchUrl: null,
    workStatus: 'in_progress',
    notes: '',
  });
  await addReference(db, userId, switcher.id, {
    referenceType: 'jira',
    referenceId: 'DAY-104',
    title: 'Workspace switcher',
    url: 'https://example.atlassian.net/browse/DAY-104',
  });

  const authReview = await createTask(db, userId, {
    workspaceId: office.id,
    title: 'Review authentication flow',
    description:
      'Review the sign-up and sign-in experience. Capture edge cases for first-time setup.',
    projectId: platform.id,
    taskTypeId: typeOf(officeConfig, 'testing'),
    priority: 'high',
    estimatedMinutes: 45,
    plannedDate: today,
    phaseId: phaseOf(officeConfig, 'code_review'),
  });

  const reports = await createTask(db, userId, {
    workspaceId: office.id,
    title: 'Fix date filter on monthly report',
    description: 'The month picker drops the last day of the month in some timezones.',
    projectId: dashboard.id,
    taskTypeId: typeOf(officeConfig, 'bug_fix'),
    priority: 'medium',
    estimatedMinutes: 90,
    plannedDate: day(-1),
    dueDate: day(-1),
    phaseId: phaseOf(officeConfig, 'qa_testing'),
  });
  await changeTaskStatus(db, userId, reports.id, {
    statusId: statusOf(officeConfig, 'blocked'),
    reason: 'Waiting for QA environment',
  });
  await addTaskRepository(db, userId, reports.id, {
    repositoryId: dashboardRepo.id,
    codebaseName: 'frontend',
    branchName: 'bugfix/month-filter',
    branchUrl: null,
    workStatus: 'in_review',
    notes: '',
  });
  await recordDelivery(db, userId, reports.id, {
    repositoryId: dashboardRepo.id,
    deliveryType: 'deployed',
    environment: 'staging',
    deliveryStatus: 'failed',
    branchName: 'bugfix/month-filter',
    deliveredAt: at(-1, 16).toISOString(),
    notes: 'Pipeline failed on flaky e2e test; re-run scheduled.',
  });

  const retro = await createTask(db, userId, {
    workspaceId: office.id,
    title: 'Sprint retrospective notes',
    description: '',
    projectId: dashboard.id,
    taskTypeId: typeOf(officeConfig, 'meeting'),
    priority: 'low',
    estimatedMinutes: 30,
    plannedDate: day(1),
  });

  const docs = await createTask(db, userId, {
    workspaceId: office.id,
    title: 'Write deployment runbook',
    description: 'Document the Vercel and Supabase setup for new contributors.',
    projectId: platform.id,
    taskTypeId: typeOf(officeConfig, 'documentation'),
    priority: 'medium',
    estimatedMinutes: 60,
    dueDate: day(5),
  });
  await planTask(db, userId, docs.id, { plannedDate: day(-2) });
  await planTask(db, userId, docs.id, { plannedDate: day(3), reason: 'carryover' });

  // Personal and learning tasks --------------------------------------------
  const meals = await createTask(db, userId, {
    workspaceId: personal.id,
    title: 'Plan meals for the week',
    description: 'Make a simple meal plan and grocery list for the next seven days.',
    projectId: lifeAdmin.id,
    taskTypeId: typeOf(personalConfig, 'personal'),
    priority: 'low',
    estimatedMinutes: 20,
    plannedDate: today,
  });
  const stretch = await createTask(db, userId, {
    workspaceId: personal.id,
    title: 'Morning mobility & stretch',
    description: 'Take twenty minutes to move before starting the workday.',
    projectId: wellbeing.id,
    taskTypeId: typeOf(personalConfig, 'personal'),
    priority: 'medium',
    estimatedMinutes: 20,
    plannedDate: today,
  });
  await changeTaskStatus(db, userId, stretch.id, {
    statusId: statusOf(personalConfig, 'completed'),
  });
  const ddia = await createTask(db, userId, {
    workspaceId: learning.id,
    title: 'Read a chapter of Designing Data-Intensive Applications',
    description: 'Focus on data models and query languages. Write down three practical takeaways.',
    projectId: bookshelf.id,
    taskTypeId: typeOf(learningConfig, 'learning'),
    priority: 'medium',
    estimatedMinutes: 30,
    plannedDate: today,
  });
  const course = await createTask(db, userId, {
    workspaceId: learning.id,
    title: 'Finish the PostgreSQL performance course',
    description: 'Two modules left: indexing strategies and query planning.',
    projectId: bookshelf.id,
    taskTypeId: typeOf(learningConfig, 'learning'),
    priority: 'low',
    estimatedMinutes: 180,
    dueDate: day(10),
  });
  void retro;
  void course;
  void meals;

  // Historical timer sessions (inserted directly so they can be back-dated).
  const sessions: {
    taskId: string;
    workspaceId: string;
    start: Date;
    minutes: number;
    phaseId?: string | null;
    description: string;
  }[] = [
    {
      taskId: foundation.id,
      workspaceId: office.id,
      start: at(-6, 9),
      minutes: 150,
      phaseId: phaseOf(officeConfig, 'development'),
      description: 'Repository and database setup',
    },
    {
      taskId: foundation.id,
      workspaceId: office.id,
      start: at(-5, 10),
      minutes: 210,
      phaseId: phaseOf(officeConfig, 'development'),
      description: 'Schema and migrations',
    },
    {
      taskId: foundation.id,
      workspaceId: office.id,
      start: at(-4, 14),
      minutes: 95,
      phaseId: phaseOf(officeConfig, 'code_review'),
      description: 'Review feedback',
    },
    {
      taskId: switcher.id,
      workspaceId: office.id,
      start: at(-3, 9, 30),
      minutes: 120,
      phaseId: phaseOf(officeConfig, 'development'),
      description: 'Switcher layout',
    },
    {
      taskId: reports.id,
      workspaceId: office.id,
      start: at(-2, 13),
      minutes: 70,
      phaseId: phaseOf(officeConfig, 'development'),
      description: 'Reproduce timezone bug',
    },
    {
      taskId: switcher.id,
      workspaceId: office.id,
      start: at(-1, 9),
      minutes: 85,
      phaseId: phaseOf(officeConfig, 'development'),
      description: 'Keyboard navigation',
    },
    {
      taskId: ddia.id,
      workspaceId: learning.id,
      start: at(-5, 20),
      minutes: 40,
      description: 'Chapter 2',
    },
    {
      taskId: ddia.id,
      workspaceId: learning.id,
      start: at(-2, 20),
      minutes: 35,
      description: 'Chapter 3',
    },
    {
      taskId: stretch.id,
      workspaceId: personal.id,
      start: at(-1, 7),
      minutes: 20,
      description: '',
    },
    { taskId: stretch.id, workspaceId: personal.id, start: at(0, 7), minutes: 20, description: '' },
    {
      taskId: switcher.id,
      workspaceId: office.id,
      start: at(0, 9),
      minutes: 70,
      phaseId: phaseOf(officeConfig, 'development'),
      description: 'Saved preferences',
    },
  ];
  for (const session of sessions) {
    const end = new Date(session.start.getTime() + session.minutes * 60000);
    const [row] = await db
      .insert(workSessions)
      .values({
        userId,
        workspaceId: session.workspaceId,
        taskId: session.taskId,
        phaseId: session.phaseId ?? null,
        status: 'completed',
        startedAt: session.start,
        endedAt: end,
        durationSeconds: session.minutes * 60,
        description: session.description,
        createdAt: session.start,
        updatedAt: end,
      })
      .returning();
    await db
      .insert(workSessionIntervals)
      .values({ userId, sessionId: row!.id, startedAt: session.start, endedAt: end });
    await db.insert(activityEvents).values({
      userId,
      workspaceId: session.workspaceId,
      taskId: session.taskId,
      eventType: 'timer.stopped',
      entityType: 'work_session',
      entityId: row!.id,
      summary: `Focus session saved · ${Math.floor(session.minutes / 60) ? `${Math.floor(session.minutes / 60)}h ` : ''}${session.minutes % 60}m`,
      detail: session.description,
      metadata: { durationSeconds: session.minutes * 60 },
      occurredAt: end,
    });
  }
  await createTimeEntry(
    db,
    userId,
    {
      taskId: authReview.id,
      workDate: day(-1),
      durationMinutes: 25,
      description: 'Reviewed sign-up copy',
      allowOverlap: false,
    },
    'UTC',
  );

  // Back-date completion so analytics show history rather than a single day.
  await db
    .update(tasks)
    .set({ completedAt: at(-4, 17), createdAt: at(-6, 8), updatedAt: at(-4, 17) })
    .where(eq(tasks.id, foundation.id));
  await db
    .update(taskStatusHistory)
    .set({ changedAt: at(-4, 17) })
    .where(
      and(
        eq(taskStatusHistory.taskId, foundation.id),
        eq(taskStatusHistory.newStatusName, 'Completed'),
      ),
    );
  await db
    .update(taskStatusHistory)
    .set({ changedAt: at(-6, 9) })
    .where(
      and(
        eq(taskStatusHistory.taskId, foundation.id),
        eq(taskStatusHistory.newStatusName, 'In Progress'),
      ),
    );
  await db
    .update(activityEvents)
    .set({ occurredAt: at(-4, 17) })
    .where(
      and(eq(activityEvents.taskId, foundation.id), eq(activityEvents.eventType, 'task.completed')),
    );

  // Planning, goals and journal --------------------------------------------
  const weekStart = startOfWeek(today, 1);
  await createWeeklyGoal(db, userId, {
    workspaceId: office.id,
    title: 'Ship the workspace switcher to UAT',
    description: '',
    weekStartDate: weekStart,
    status: 'in_progress',
  });
  await createWeeklyGoal(db, userId, {
    workspaceId: personal.id,
    title: 'Move every morning',
    description: '',
    weekStartDate: weekStart,
    status: 'in_progress',
  });
  await createWeeklyGoal(db, userId, {
    workspaceId: learning.id,
    title: 'Read two chapters',
    description: '',
    weekStartDate: weekStart,
    status: 'planned',
  });
  await createWeeklyGoal(db, userId, {
    workspaceId: null,
    title: 'Lay the foundation for Daymark',
    description: '',
    weekStartDate: weekStart,
    status: 'completed',
  });

  await upsertDailyReview(db, userId, {
    reviewDate: day(-1),
    notes: 'Deep work in the morning, meetings after lunch.',
    accomplishments: 'Keyboard navigation for the switcher works end to end.',
    blockers: 'QA environment still down for the report fix.',
    learnings: 'Timezone bugs are easier to reproduce with a fixed clock in tests.',
    tomorrowPriorities: 'Saved preferences, then review the auth flow.',
    rating: 4,
    reviewed: true,
  });

  await createJournalEntry(db, userId, {
    workspaceId: office.id,
    projectId: platform.id,
    title: 'Why we keep statuses and phases separate',
    content:
      '**Status** answers *what state is the task in*; **phase** answers *which stage of execution it is in*.\n\nA task can move from Development back to Code Review without losing history, and the timer keeps running either way.',
    entryType: 'technical',
    entryDate: day(-3),
    taskIds: [foundation.id],
  });
  await createJournalEntry(db, userId, {
    workspaceId: learning.id,
    projectId: bookshelf.id,
    title: 'DDIA chapter 2 takeaways',
    content:
      '- Relational vs document models are about locality.\n- Schema-on-read is still a schema.\n- Graph models shine for many-to-many data.',
    entryType: 'learning',
    entryDate: day(-5),
    taskIds: [ddia.id],
  });
  await createJournalEntry(db, userId, {
    workspaceId: personal.id,
    title: 'A quieter morning',
    content:
      'Twenty minutes of stretching before opening the laptop made the whole day feel calmer.',
    entryType: 'personal',
    entryDate: day(-1),
  });
  await createJournalEntry(db, userId, {
    workspaceId: office.id,
    projectId: platform.id,
    title: 'v0.1.0 is live',
    content:
      'Foundation release deployed and verified on production. First delivery record complete.',
    entryType: 'achievement',
    entryDate: day(-2),
    taskIds: [foundation.id],
  });

  await markOnboardingComplete(db, userId);
  return { created: true, userId, email: DEMO_EMAIL };
}
