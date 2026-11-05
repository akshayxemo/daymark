import { and, asc, eq, inArray } from 'drizzle-orm';
import type { DbExecutor, Transaction } from '@/server/db/client';
import { userSettings, workSessionIntervals, workSessions } from '@/server/db/schema';
import { recordActivity } from '../activity/record';

/**
 * Low-level timer primitives shared by the time-tracking service and the
 * task lifecycle (timer-stopping statuses). Keeps no dependency on the task
 * service so the two modules never import each other.
 */

export type SessionRow = typeof workSessions.$inferSelect;
export type IntervalRow = typeof workSessionIntervals.$inferSelect;

/** Serialises every timer operation of a user inside the current transaction. */
export async function lockUserTimer(tx: Transaction, userId: string) {
  await tx
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .for('update');
}

export async function getActiveSession(db: DbExecutor, userId: string): Promise<SessionRow | null> {
  const [row] = await db
    .select()
    .from(workSessions)
    .where(
      and(eq(workSessions.userId, userId), inArray(workSessions.status, ['running', 'paused'])),
    )
    .limit(1);
  return row ?? null;
}

export async function getIntervals(db: DbExecutor, sessionId: string): Promise<IntervalRow[]> {
  return db
    .select()
    .from(workSessionIntervals)
    .where(eq(workSessionIntervals.sessionId, sessionId))
    .orderBy(asc(workSessionIntervals.startedAt));
}

/** Active seconds = closed intervals + the open interval measured at `now`. */
export function elapsedSeconds(
  intervals: Pick<IntervalRow, 'startedAt' | 'endedAt'>[],
  now: Date,
): number {
  let total = 0;
  for (const interval of intervals) {
    const end = interval.endedAt ?? now;
    total += Math.max(0, Math.floor((end.getTime() - interval.startedAt.getTime()) / 1000));
  }
  return total;
}

/** Closes the open interval of a session, if any. Returns the closed row. */
export async function closeOpenInterval(tx: Transaction, sessionId: string, endedAt: Date) {
  const intervals = await getIntervals(tx, sessionId);
  const openInterval = intervals.find((row) => row.endedAt === null);
  if (!openInterval) return null;
  const safeEnd =
    endedAt.getTime() < openInterval.startedAt.getTime() ? openInterval.startedAt : endedAt;
  const [row] = await tx
    .update(workSessionIntervals)
    .set({ endedAt: safeEnd })
    .where(eq(workSessionIntervals.id, openInterval.id))
    .returning();
  return row ?? null;
}

/**
 * Finalises a session: closes the open interval, stores the total active
 * seconds and marks it completed (or cancelled when nothing was tracked).
 */
export async function completeSession(
  tx: Transaction,
  session: SessionRow,
  endedAt: Date = new Date(),
): Promise<SessionRow> {
  await closeOpenInterval(tx, session.id, endedAt);
  const intervals = await getIntervals(tx, session.id);
  const duration = elapsedSeconds(intervals, endedAt);
  const [row] = await tx
    .update(workSessions)
    .set({
      status: duration > 0 ? 'completed' : 'cancelled',
      endedAt,
      durationSeconds: duration,
      updatedAt: new Date(),
    })
    .where(eq(workSessions.id, session.id))
    .returning();
  return row!;
}

/**
 * Stops the user's active timer if it belongs to the given task (used when a
 * task enters a timer-stopping status). Returns the completed session or null.
 */
export async function stopActiveSessionForTask(
  tx: Transaction,
  userId: string,
  taskId: string,
  context: { taskTitle: string; workspaceId: string; reason: string },
): Promise<SessionRow | null> {
  const active = await getActiveSession(tx, userId);
  if (!active || active.taskId !== taskId) return null;
  const completed = await completeSession(tx, active);
  await recordActivity(tx, {
    userId,
    workspaceId: context.workspaceId,
    taskId,
    eventType: 'timer.stopped',
    entityType: 'work_session',
    entityId: completed.id,
    summary: `Timer stopped · ${formatSeconds(completed.durationSeconds)}`,
    detail: `${context.taskTitle} · ${context.reason}`,
    metadata: { durationSeconds: completed.durationSeconds, automatic: true },
  });
  return completed;
}

export function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}
