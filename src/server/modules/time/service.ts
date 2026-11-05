import { and, asc, desc, eq, gte, inArray, isNull, lte, lt, gt, ne, sql } from 'drizzle-orm';
import type { DbExecutor, Transaction } from '@/server/db/client';
import {
  projects,
  taskPhases,
  taskStatuses,
  tasks,
  timeEntries,
  timeEntryAudit,
  workSessionIntervals,
  workSessions,
} from '@/server/db/schema';
import { localDay } from '@/server/db/sql';
import { withTransaction } from '@/server/db/transaction';
import { ConflictError, NotFoundError, ValidationError } from '@/server/http/errors';
import type {
  CreateTimeEntryInput,
  ListTimeQuery,
  StartTimerInput,
  UpdateTimeEntryInput,
} from '@/lib/validation/time';
import { recordActivity, recordAudit } from '../activity/record';
import { changeTaskStatus, getTaskRow } from '../tasks/service';
import {
  completeSession,
  elapsedSeconds,
  formatSeconds,
  getActiveSession,
  getIntervals,
  lockUserTimer,
  type SessionRow,
} from './engine';

/* ------------------------------------------------------------------ */
/* Timer state                                                         */
/* ------------------------------------------------------------------ */

export type TimerState = {
  active: null | {
    sessionId: string;
    status: 'running' | 'paused';
    startedAt: string;
    /** Active seconds accumulated up to `serverTime`. */
    elapsedSeconds: number;
    /** When running, the instant the current interval started. */
    runningSince: string | null;
    description: string;
    phaseId: string | null;
    phaseName: string | null;
    task: {
      id: string;
      taskNumber: number;
      title: string;
      workspaceId: string;
      projectName: string | null;
    };
  };
  serverTime: string;
};

export async function getTimerState(db: DbExecutor, userId: string): Promise<TimerState> {
  const now = new Date();
  const session = await getActiveSession(db, userId);
  if (!session) return { active: null, serverTime: now.toISOString() };
  const intervals = await getIntervals(db, session.id);
  const [task] = await db
    .select({
      id: tasks.id,
      taskNumber: tasks.taskNumber,
      title: tasks.title,
      workspaceId: tasks.workspaceId,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(eq(tasks.id, session.taskId))
    .limit(1);
  const [phase] = session.phaseId
    ? await db
        .select({ name: taskPhases.name })
        .from(taskPhases)
        .where(eq(taskPhases.id, session.phaseId))
        .limit(1)
    : [null];
  const open = intervals.find((row) => row.endedAt === null);
  return {
    active: {
      sessionId: session.id,
      status: session.status as 'running' | 'paused',
      startedAt: session.startedAt.toISOString(),
      elapsedSeconds: elapsedSeconds(intervals, now),
      runningSince: open?.startedAt.toISOString() ?? null,
      description: session.description,
      phaseId: session.phaseId,
      phaseName: phase?.name ?? null,
      task: task ?? {
        id: session.taskId,
        taskNumber: 0,
        title: 'Task',
        workspaceId: session.workspaceId,
        projectName: null,
      },
    },
    serverTime: now.toISOString(),
  };
}

async function assertPhaseInWorkspace(db: DbExecutor, workspaceId: string, phaseId: string) {
  const [row] = await db
    .select({ id: taskPhases.id })
    .from(taskPhases)
    .where(and(eq(taskPhases.workspaceId, workspaceId), eq(taskPhases.id, phaseId)))
    .limit(1);
  if (!row) {
    throw new ValidationError('Phase not found in this workspace.', [
      { path: 'phaseId', message: 'Choose a phase from the task’s workspace.' },
    ]);
  }
}

async function stopWithEvent(
  tx: Transaction,
  userId: string,
  session: SessionRow,
  reason: string,
  description?: string,
) {
  const completed = await completeSession(tx, session);
  if (description !== undefined) {
    await tx.update(workSessions).set({ description }).where(eq(workSessions.id, completed.id));
  }
  const task = await getTaskRow(tx, userId, session.taskId);
  await recordActivity(tx, {
    userId,
    workspaceId: session.workspaceId,
    taskId: session.taskId,
    projectId: task.projectId,
    eventType: 'timer.stopped',
    entityType: 'work_session',
    entityId: completed.id,
    summary:
      completed.status === 'cancelled'
        ? 'Timer stopped · nothing recorded'
        : `Focus session saved · ${formatSeconds(completed.durationSeconds)}`,
    detail: `${task.title}${reason ? ` · ${reason}` : ''}`,
    metadata: { durationSeconds: completed.durationSeconds },
  });
  return completed;
}

/* ------------------------------------------------------------------ */
/* Timer operations                                                    */
/* ------------------------------------------------------------------ */

export async function startTimer(
  db: DbExecutor,
  userId: string,
  input: StartTimerInput,
): Promise<TimerState> {
  await withTransaction(db, async (tx) => {
    await lockUserTimer(tx, userId);
    const task = await getTaskRow(tx, userId, input.taskId);
    if (task.archivedAt) throw new ConflictError('Restore the task before tracking time on it.');
    if (input.phaseId) await assertPhaseInWorkspace(tx, task.workspaceId, input.phaseId);
    const active = await getActiveSession(tx, userId);
    if (active) {
      if (active.taskId === task.id && active.status === 'running') return;
      if (active.taskId === task.id && active.status === 'paused') {
        await resumeInTransaction(tx, userId, active);
        return;
      }
      await stopWithEvent(tx, userId, active, 'Switched to another task');
    }
    const now = new Date();
    const [session] = await tx
      .insert(workSessions)
      .values({
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        phaseId: input.phaseId ?? task.phaseId ?? null,
        status: 'running',
        startedAt: now,
        description: input.description ?? '',
      })
      .returning();
    await tx
      .insert(workSessionIntervals)
      .values({ userId, sessionId: session!.id, startedAt: now });
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'timer.started',
      entityType: 'work_session',
      entityId: session!.id,
      summary: 'Focus session started',
      detail: task.title,
      occurredAt: now,
    });
    // Move the task into the workspace's active status unless it is already active.
    const [current] = await tx
      .select({ isActive: taskStatuses.isActive })
      .from(taskStatuses)
      .where(eq(taskStatuses.id, task.statusId))
      .limit(1);
    if (!current?.isActive) {
      const [activeStatus] = await tx
        .select({ id: taskStatuses.id })
        .from(taskStatuses)
        .where(
          and(
            eq(taskStatuses.workspaceId, task.workspaceId),
            eq(taskStatuses.isActive, true),
            isNull(taskStatuses.archivedAt),
          ),
        )
        .orderBy(asc(taskStatuses.position))
        .limit(1);
      if (activeStatus) {
        await changeTaskStatus(tx, userId, task.id, {
          statusId: activeStatus.id,
          reason: 'Timer started',
        });
      }
    }
  });
  return getTimerState(db, userId);
}

export async function pauseTimer(db: DbExecutor, userId: string): Promise<TimerState> {
  await withTransaction(db, async (tx) => {
    await lockUserTimer(tx, userId);
    const active = await getActiveSession(tx, userId);
    if (!active) throw new NotFoundError('No timer is running.');
    if (active.status === 'paused') return;
    const now = new Date();
    const intervals = await getIntervals(tx, active.id);
    const open = intervals.find((row) => row.endedAt === null);
    if (open) {
      await tx
        .update(workSessionIntervals)
        .set({ endedAt: now })
        .where(eq(workSessionIntervals.id, open.id));
    }
    await tx
      .update(workSessions)
      .set({ status: 'paused', updatedAt: now })
      .where(eq(workSessions.id, active.id));
    const task = await getTaskRow(tx, userId, active.taskId);
    await recordActivity(tx, {
      userId,
      workspaceId: active.workspaceId,
      taskId: active.taskId,
      projectId: task.projectId,
      eventType: 'timer.paused',
      entityType: 'work_session',
      entityId: active.id,
      summary: `Timer paused · ${formatSeconds(elapsedSeconds(await getIntervals(tx, active.id), now))}`,
      detail: task.title,
      occurredAt: now,
    });
  });
  return getTimerState(db, userId);
}

async function resumeInTransaction(tx: Transaction, userId: string, active: SessionRow) {
  const now = new Date();
  await tx.insert(workSessionIntervals).values({ userId, sessionId: active.id, startedAt: now });
  await tx
    .update(workSessions)
    .set({ status: 'running', updatedAt: now })
    .where(eq(workSessions.id, active.id));
  const task = await getTaskRow(tx, userId, active.taskId);
  await recordActivity(tx, {
    userId,
    workspaceId: active.workspaceId,
    taskId: active.taskId,
    projectId: task.projectId,
    eventType: 'timer.resumed',
    entityType: 'work_session',
    entityId: active.id,
    summary: 'Timer resumed',
    detail: task.title,
    occurredAt: now,
  });
}

export async function resumeTimer(db: DbExecutor, userId: string): Promise<TimerState> {
  await withTransaction(db, async (tx) => {
    await lockUserTimer(tx, userId);
    const active = await getActiveSession(tx, userId);
    if (!active) throw new NotFoundError('No paused timer to resume.');
    if (active.status === 'running') return;
    await resumeInTransaction(tx, userId, active);
  });
  return getTimerState(db, userId);
}

export async function stopTimer(
  db: DbExecutor,
  userId: string,
  input: { description?: string } = {},
) {
  const completed = await withTransaction(db, async (tx) => {
    await lockUserTimer(tx, userId);
    const active = await getActiveSession(tx, userId);
    if (!active) throw new NotFoundError('No timer is running.');
    return stopWithEvent(tx, userId, active, '', input.description);
  });
  return { session: completed, state: await getTimerState(db, userId) };
}

/** Discards the active session without recording time. */
export async function cancelTimer(db: DbExecutor, userId: string): Promise<TimerState> {
  await withTransaction(db, async (tx) => {
    await lockUserTimer(tx, userId);
    const active = await getActiveSession(tx, userId);
    if (!active) throw new NotFoundError('No timer is running.');
    const now = new Date();
    const intervals = await getIntervals(tx, active.id);
    const open = intervals.find((row) => row.endedAt === null);
    if (open)
      await tx
        .update(workSessionIntervals)
        .set({ endedAt: now })
        .where(eq(workSessionIntervals.id, open.id));
    await tx
      .update(workSessions)
      .set({ status: 'cancelled', endedAt: now, durationSeconds: 0, updatedAt: now })
      .where(eq(workSessions.id, active.id));
    const task = await getTaskRow(tx, userId, active.taskId);
    await recordActivity(tx, {
      userId,
      workspaceId: active.workspaceId,
      taskId: active.taskId,
      projectId: task.projectId,
      eventType: 'timer.cancelled',
      entityType: 'work_session',
      entityId: active.id,
      summary: 'Timer discarded',
      detail: task.title,
      occurredAt: now,
    });
    await recordAudit(tx, {
      userId,
      action: 'work_session.cancelled',
      entityType: 'work_session',
      entityId: active.id,
      before: { status: active.status, discardedSeconds: elapsedSeconds(intervals, now) },
      after: { status: 'cancelled' },
    });
  });
  return getTimerState(db, userId);
}

export async function updateActiveSession(
  db: DbExecutor,
  userId: string,
  input: { description?: string; phaseId?: string | null },
): Promise<TimerState> {
  await withTransaction(db, async (tx) => {
    await lockUserTimer(tx, userId);
    const active = await getActiveSession(tx, userId);
    if (!active) throw new NotFoundError('No timer is running.');
    if (input.phaseId) await assertPhaseInWorkspace(tx, active.workspaceId, input.phaseId);
    await tx
      .update(workSessions)
      .set({
        description: input.description ?? active.description,
        phaseId: input.phaseId === undefined ? active.phaseId : input.phaseId,
        updatedAt: new Date(),
      })
      .where(eq(workSessions.id, active.id));
  });
  return getTimerState(db, userId);
}

/** Edits the description or phase of a completed session (audited). */
export async function updateSession(
  db: DbExecutor,
  userId: string,
  sessionId: string,
  input: { description?: string; phaseId?: string | null },
) {
  return withTransaction(db, async (tx) => {
    const [session] = await tx
      .select()
      .from(workSessions)
      .where(and(eq(workSessions.userId, userId), eq(workSessions.id, sessionId)))
      .for('update');
    if (!session) throw new NotFoundError('Session not found.');
    if (input.phaseId) await assertPhaseInWorkspace(tx, session.workspaceId, input.phaseId);
    const [row] = await tx
      .update(workSessions)
      .set({
        description: input.description ?? session.description,
        phaseId: input.phaseId === undefined ? session.phaseId : input.phaseId,
        updatedAt: new Date(),
      })
      .where(eq(workSessions.id, session.id))
      .returning();
    await recordAudit(tx, {
      userId,
      action: 'work_session.updated',
      entityType: 'work_session',
      entityId: session.id,
      before: { description: session.description, phaseId: session.phaseId },
      after: { description: row!.description, phaseId: row!.phaseId },
    });
    return row!;
  });
}

/* ------------------------------------------------------------------ */
/* Manual time entries                                                 */
/* ------------------------------------------------------------------ */

export type OverlapConflict = {
  kind: 'session' | 'manual';
  id: string;
  taskId: string;
  startedAt: string;
  endedAt: string;
};

async function findOverlaps(
  db: DbExecutor,
  userId: string,
  startedAt: Date,
  endedAt: Date,
  excludeEntryId?: string,
): Promise<OverlapConflict[]> {
  const sessionRows = await db
    .select({
      id: workSessions.id,
      taskId: workSessions.taskId,
      startedAt: workSessionIntervals.startedAt,
      endedAt: workSessionIntervals.endedAt,
    })
    .from(workSessionIntervals)
    .innerJoin(workSessions, eq(workSessions.id, workSessionIntervals.sessionId))
    .where(
      and(
        eq(workSessions.userId, userId),
        inArray(workSessions.status, ['completed', 'running', 'paused']),
        lt(workSessionIntervals.startedAt, endedAt),
        // Raw fragments bypass column type mapping, so the parameter is passed as ISO text.
        gt(sql`coalesce(${workSessionIntervals.endedAt}, now())`, startedAt.toISOString()),
      ),
    )
    .limit(20);
  const entryConditions = [
    eq(timeEntries.userId, userId),
    isNull(timeEntries.deletedAt),
    lt(timeEntries.startedAt, endedAt),
    gt(timeEntries.endedAt, startedAt),
  ];
  if (excludeEntryId) entryConditions.push(ne(timeEntries.id, excludeEntryId));
  const entryRows = await db
    .select({
      id: timeEntries.id,
      taskId: timeEntries.taskId,
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
    })
    .from(timeEntries)
    .where(and(...entryConditions))
    .limit(20);
  return [
    ...sessionRows.map((row) => ({
      kind: 'session' as const,
      id: row.id,
      taskId: row.taskId,
      startedAt: row.startedAt.toISOString(),
      endedAt: (row.endedAt ?? new Date()).toISOString(),
    })),
    ...entryRows.map((row) => ({
      kind: 'manual' as const,
      id: row.id,
      taskId: row.taskId,
      startedAt: row.startedAt!.toISOString(),
      endedAt: row.endedAt!.toISOString(),
    })),
  ];
}

/** Calendar date of an instant in the given IANA timezone. */
export function localDateFor(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function resolveEntryTimes(
  input: {
    workDate?: string;
    durationMinutes?: number;
    startedAt?: string | null;
    endedAt?: string | null;
  },
  timezone: string,
) {
  if (input.startedAt && input.endedAt) {
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    return {
      startedAt,
      endedAt,
      durationSeconds: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
      workDate: input.workDate ?? localDateFor(startedAt, timezone),
    };
  }
  return {
    startedAt: null,
    endedAt: null,
    durationSeconds: (input.durationMinutes ?? 0) * 60,
    workDate: input.workDate!,
  };
}

export async function createTimeEntry(
  db: DbExecutor,
  userId: string,
  input: CreateTimeEntryInput,
  timezone: string,
) {
  return withTransaction(db, async (tx) => {
    const task = await getTaskRow(tx, userId, input.taskId);
    if (task.archivedAt) throw new ConflictError('Restore the task before adding time to it.');
    if (input.phaseId) await assertPhaseInWorkspace(tx, task.workspaceId, input.phaseId);
    const times = resolveEntryTimes(input, timezone);
    let conflicts: OverlapConflict[] = [];
    if (times.startedAt && times.endedAt) {
      conflicts = await findOverlaps(tx, userId, times.startedAt, times.endedAt);
      if (conflicts.length && !input.allowOverlap) {
        throw new ConflictError('This entry overlaps existing time records.', { conflicts });
      }
    }
    const [entry] = await tx
      .insert(timeEntries)
      .values({
        userId,
        workspaceId: task.workspaceId,
        taskId: task.id,
        phaseId: input.phaseId ?? null,
        workDate: times.workDate,
        startedAt: times.startedAt,
        endedAt: times.endedAt,
        durationSeconds: times.durationSeconds,
        description: input.description ?? '',
      })
      .returning();
    await tx.insert(timeEntryAudit).values({
      userId,
      timeEntryId: entry!.id,
      action: 'created',
      beforeData: null,
      afterData: snapshotEntry(entry!),
      reason: conflicts.length ? `Overlap acknowledged with ${conflicts.length} record(s)` : null,
    });
    await recordActivity(tx, {
      userId,
      workspaceId: task.workspaceId,
      taskId: task.id,
      projectId: task.projectId,
      eventType: 'time_entry.created',
      entityType: 'time_entry',
      entityId: entry!.id,
      summary: `Manual time added · ${formatSeconds(entry!.durationSeconds)}`,
      detail: `${task.title} · ${entry!.workDate}`,
      metadata: { durationSeconds: entry!.durationSeconds, overlaps: conflicts.length },
    });
    return entry!;
  });
}

function snapshotEntry(entry: typeof timeEntries.$inferSelect): Record<string, unknown> {
  return {
    workDate: entry.workDate,
    startedAt: entry.startedAt?.toISOString() ?? null,
    endedAt: entry.endedAt?.toISOString() ?? null,
    durationSeconds: entry.durationSeconds,
    description: entry.description,
    phaseId: entry.phaseId,
  };
}

export async function updateTimeEntry(
  db: DbExecutor,
  userId: string,
  entryId: string,
  input: UpdateTimeEntryInput,
  timezone: string,
) {
  return withTransaction(db, async (tx) => {
    const [entry] = await tx
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          eq(timeEntries.id, entryId),
          isNull(timeEntries.deletedAt),
        ),
      )
      .for('update');
    if (!entry) throw new NotFoundError('Time entry not found.');
    if (input.phaseId) await assertPhaseInWorkspace(tx, entry.workspaceId, input.phaseId);
    const merged = {
      workDate: input.workDate ?? entry.workDate,
      durationMinutes: input.durationMinutes ?? Math.round(entry.durationSeconds / 60),
      startedAt: input.startedAt === undefined ? entry.startedAt?.toISOString() : input.startedAt,
      endedAt: input.endedAt === undefined ? entry.endedAt?.toISOString() : input.endedAt,
    };
    if ((merged.startedAt && !merged.endedAt) || (!merged.startedAt && merged.endedAt)) {
      throw new ValidationError('Provide both a start and an end time, or neither.');
    }
    if (
      merged.startedAt &&
      merged.endedAt &&
      new Date(merged.endedAt) <= new Date(merged.startedAt)
    ) {
      throw new ValidationError('End time must be after the start time.', [
        { path: 'endedAt', message: 'Must be after the start time.' },
      ]);
    }
    const times = resolveEntryTimes(merged, timezone);
    let conflicts: OverlapConflict[] = [];
    if (times.startedAt && times.endedAt) {
      conflicts = await findOverlaps(tx, userId, times.startedAt, times.endedAt, entry.id);
      if (conflicts.length && !input.allowOverlap) {
        throw new ConflictError('This entry overlaps existing time records.', { conflicts });
      }
    }
    const [updated] = await tx
      .update(timeEntries)
      .set({
        workDate: times.workDate,
        startedAt: times.startedAt,
        endedAt: times.endedAt,
        durationSeconds: times.durationSeconds,
        phaseId: input.phaseId === undefined ? entry.phaseId : input.phaseId,
        description: input.description ?? entry.description,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, entry.id))
      .returning();
    await tx.insert(timeEntryAudit).values({
      userId,
      timeEntryId: entry.id,
      action: 'updated',
      beforeData: snapshotEntry(entry),
      afterData: snapshotEntry(updated!),
      reason:
        input.reason ??
        (conflicts.length ? `Overlap acknowledged with ${conflicts.length} record(s)` : null),
    });
    const task = await getTaskRow(tx, userId, entry.taskId);
    await recordActivity(tx, {
      userId,
      workspaceId: entry.workspaceId,
      taskId: entry.taskId,
      projectId: task.projectId,
      eventType: 'time_entry.updated',
      entityType: 'time_entry',
      entityId: entry.id,
      summary: `Manual time edited · ${formatSeconds(entry.durationSeconds)} → ${formatSeconds(updated!.durationSeconds)}`,
      detail: `${task.title}${input.reason ? ` · ${input.reason}` : ''}`,
      metadata: { before: entry.durationSeconds, after: updated!.durationSeconds },
    });
    return updated!;
  });
}

export async function deleteTimeEntry(
  db: DbExecutor,
  userId: string,
  entryId: string,
  reason?: string,
) {
  return withTransaction(db, async (tx) => {
    const [entry] = await tx
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          eq(timeEntries.id, entryId),
          isNull(timeEntries.deletedAt),
        ),
      )
      .for('update');
    if (!entry) throw new NotFoundError('Time entry not found.');
    await tx
      .update(timeEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(timeEntries.id, entry.id));
    await tx.insert(timeEntryAudit).values({
      userId,
      timeEntryId: entry.id,
      action: 'deleted',
      beforeData: snapshotEntry(entry),
      afterData: null,
      reason: reason ?? null,
    });
    const task = await getTaskRow(tx, userId, entry.taskId);
    await recordActivity(tx, {
      userId,
      workspaceId: entry.workspaceId,
      taskId: entry.taskId,
      projectId: task.projectId,
      eventType: 'time_entry.deleted',
      entityType: 'time_entry',
      entityId: entry.id,
      summary: `Manual time removed · ${formatSeconds(entry.durationSeconds)}`,
      detail: `${task.title}${reason ? ` · ${reason}` : ''}`,
    });
  });
}

/* ------------------------------------------------------------------ */
/* Listing and aggregation                                             */
/* ------------------------------------------------------------------ */

export type TimeRecord = {
  id: string;
  kind: 'session' | 'manual';
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  workspaceId: string;
  projectName: string | null;
  phaseName: string | null;
  workDate: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  description: string;
};

export async function listTimeRecords(
  db: DbExecutor,
  userId: string,
  query: ListTimeQuery,
  timezone: string,
): Promise<TimeRecord[]> {
  const sessionDay = localDay(workSessions.startedAt, timezone);
  const sessionConditions = [eq(workSessions.userId, userId), eq(workSessions.status, 'completed')];
  const entryConditions = [eq(timeEntries.userId, userId), isNull(timeEntries.deletedAt)];
  if (query.workspaceId) {
    sessionConditions.push(eq(workSessions.workspaceId, query.workspaceId));
    entryConditions.push(eq(timeEntries.workspaceId, query.workspaceId));
  }
  if (query.taskId) {
    sessionConditions.push(eq(workSessions.taskId, query.taskId));
    entryConditions.push(eq(timeEntries.taskId, query.taskId));
  }
  if (query.from) {
    sessionConditions.push(gte(sessionDay, query.from));
    entryConditions.push(gte(timeEntries.workDate, query.from));
  }
  if (query.to) {
    sessionConditions.push(lte(sessionDay, query.to));
    entryConditions.push(lte(timeEntries.workDate, query.to));
  }
  const take = query.limit + query.offset;
  const [sessionRows, entryRows] = await Promise.all([
    db
      .select({
        id: workSessions.id,
        taskId: workSessions.taskId,
        taskNumber: tasks.taskNumber,
        taskTitle: tasks.title,
        workspaceId: workSessions.workspaceId,
        projectName: projects.name,
        phaseName: taskPhases.name,
        workDate: sessionDay,
        startedAt: workSessions.startedAt,
        endedAt: workSessions.endedAt,
        durationSeconds: workSessions.durationSeconds,
        description: workSessions.description,
      })
      .from(workSessions)
      .innerJoin(tasks, eq(tasks.id, workSessions.taskId))
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(taskPhases, eq(taskPhases.id, workSessions.phaseId))
      .where(and(...sessionConditions))
      .orderBy(desc(workSessions.startedAt))
      .limit(take),
    db
      .select({
        id: timeEntries.id,
        taskId: timeEntries.taskId,
        taskNumber: tasks.taskNumber,
        taskTitle: tasks.title,
        workspaceId: timeEntries.workspaceId,
        projectName: projects.name,
        phaseName: taskPhases.name,
        workDate: timeEntries.workDate,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
        durationSeconds: timeEntries.durationSeconds,
        description: timeEntries.description,
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(taskPhases, eq(taskPhases.id, timeEntries.phaseId))
      .where(and(...entryConditions))
      .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt))
      .limit(take),
  ]);
  const records: TimeRecord[] = [
    ...sessionRows.map((row) => ({
      ...row,
      kind: 'session' as const,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt?.toISOString() ?? null,
    })),
    ...entryRows.map((row) => ({
      ...row,
      kind: 'manual' as const,
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
    })),
  ];
  records.sort((a, b) => {
    const dayCompare = b.workDate.localeCompare(a.workDate);
    if (dayCompare !== 0) return dayCompare;
    return (b.startedAt ?? '').localeCompare(a.startedAt ?? '');
  });
  return records.slice(query.offset, query.offset + query.limit);
}

export type DailyTotal = {
  day: string;
  workspaceId: string;
  seconds: number;
  sessions: number;
  manual: number;
};

/** Tracked seconds per day and workspace, combining timer sessions and manual entries. */
export async function dailyTotals(
  db: DbExecutor,
  userId: string,
  range: { from: string; to: string; workspaceId?: string },
  timezone: string,
): Promise<DailyTotal[]> {
  const sessionDay = localDay(workSessions.startedAt, timezone);
  const sessionConditions = [
    eq(workSessions.userId, userId),
    eq(workSessions.status, 'completed'),
    gte(sessionDay, range.from),
    lte(sessionDay, range.to),
  ];
  const entryConditions = [
    eq(timeEntries.userId, userId),
    isNull(timeEntries.deletedAt),
    gte(timeEntries.workDate, range.from),
    lte(timeEntries.workDate, range.to),
  ];
  if (range.workspaceId) {
    sessionConditions.push(eq(workSessions.workspaceId, range.workspaceId));
    entryConditions.push(eq(timeEntries.workspaceId, range.workspaceId));
  }
  const [sessionRows, entryRows] = await Promise.all([
    db
      .select({
        day: sessionDay,
        workspaceId: workSessions.workspaceId,
        seconds: sql<number>`coalesce(sum(${workSessions.durationSeconds}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(workSessions)
      .where(and(...sessionConditions))
      .groupBy(sessionDay, workSessions.workspaceId),
    db
      .select({
        day: timeEntries.workDate,
        workspaceId: timeEntries.workspaceId,
        seconds: sql<number>`coalesce(sum(${timeEntries.durationSeconds}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(timeEntries)
      .where(and(...entryConditions))
      .groupBy(timeEntries.workDate, timeEntries.workspaceId),
  ]);
  const totals = new Map<string, DailyTotal>();
  const key = (day: string, workspaceId: string) => `${day}|${workspaceId}`;
  for (const row of sessionRows) {
    const entry = totals.get(key(row.day, row.workspaceId)) ?? {
      day: row.day,
      workspaceId: row.workspaceId,
      seconds: 0,
      sessions: 0,
      manual: 0,
    };
    entry.seconds += row.seconds;
    entry.sessions += row.count;
    totals.set(key(row.day, row.workspaceId), entry);
  }
  for (const row of entryRows) {
    const entry = totals.get(key(row.day, row.workspaceId)) ?? {
      day: row.day,
      workspaceId: row.workspaceId,
      seconds: 0,
      sessions: 0,
      manual: 0,
    };
    entry.seconds += row.seconds;
    entry.manual += row.count;
    totals.set(key(row.day, row.workspaceId), entry);
  }
  return [...totals.values()].sort((a, b) => a.day.localeCompare(b.day));
}
