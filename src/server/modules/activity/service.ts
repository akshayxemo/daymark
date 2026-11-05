import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { DbExecutor } from '@/server/db/client';
import { activityEvents, projects, tasks, workspaces } from '@/server/db/schema';
import { localDay } from '@/server/db/sql';
import { isoDateSchema, paginationSchema, uuidSchema } from '@/lib/validation/common';

export const listActivityQuerySchema = paginationSchema.extend({
  workspaceId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  /** Comma-separated event types or prefixes such as "task." */
  types: z.string().max(400).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;

export type ActivityView = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  detail: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  workspaceId: string | null;
  workspaceName: string | null;
  taskId: string | null;
  taskNumber: number | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
};

/** Event-type groups offered as filters in the timeline. */
export const activityGroups: Record<string, string[]> = {
  tasks: [
    'task.created',
    'task.updated',
    'task.completed',
    'task.archived',
    'task.restored',
    'task.project_changed',
  ],
  status: ['task.status_changed'],
  phase: ['task.phase_changed'],
  priority: ['task.priority_changed'],
  deadlines: ['task.deadline_changed'],
  planning: ['task.planned', 'task.carried_over', 'task.unplanned'],
  timer: ['timer.started', 'timer.paused', 'timer.resumed', 'timer.stopped', 'timer.cancelled'],
  time_entries: ['time_entry.created', 'time_entry.updated', 'time_entry.deleted'],
  repositories: [
    'repository.created',
    'repository.updated',
    'repository.archived',
    'repository.restored',
    'task.repository_linked',
    'task.repository_updated',
    'task.repository_unlinked',
    'task.branch_changed',
    'task.reference_added',
    'task.reference_removed',
  ],
  deliveries: [
    'delivery.merged',
    'delivery.deployed',
    'delivery.verified',
    'delivery.updated',
    'delivery.removed',
  ],
  projects: ['project.created', 'project.updated', 'project.archived', 'project.restored'],
  workspaces: [
    'workspace.created',
    'workspace.updated',
    'workspace.archived',
    'workspace.restored',
  ],
  journal: [
    'journal.created',
    'review.completed',
    'goal.created',
    'goal.completed',
    'goal.updated',
  ],
};

export async function listActivity(
  db: DbExecutor,
  userId: string,
  query: ListActivityQuery,
  timezone: string,
): Promise<{ items: ActivityView[]; total: number }> {
  const conditions: SQL[] = [eq(activityEvents.userId, userId)];
  if (query.workspaceId) conditions.push(eq(activityEvents.workspaceId, query.workspaceId));
  if (query.taskId) conditions.push(eq(activityEvents.taskId, query.taskId));
  if (query.projectId) conditions.push(eq(activityEvents.projectId, query.projectId));
  const day = localDay(activityEvents.occurredAt, timezone);
  if (query.from) conditions.push(gte(day, query.from));
  if (query.to) conditions.push(lte(day, query.to));
  if (query.types) {
    const requested = query.types
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const expanded = requested.flatMap((value) => activityGroups[value] ?? [value]);
    if (expanded.length) conditions.push(inArray(activityEvents.eventType, expanded));
  }
  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        event: activityEvents,
        workspaceName: workspaces.name,
        taskNumber: tasks.taskNumber,
        taskTitle: tasks.title,
        projectName: projects.name,
      })
      .from(activityEvents)
      .leftJoin(workspaces, eq(workspaces.id, activityEvents.workspaceId))
      .leftJoin(tasks, eq(tasks.id, activityEvents.taskId))
      .leftJoin(projects, eq(projects.id, activityEvents.projectId))
      .where(where)
      .orderBy(desc(activityEvents.occurredAt), desc(activityEvents.id))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(activityEvents)
      .where(where),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.event.id,
      eventType: row.event.eventType,
      entityType: row.event.entityType,
      entityId: row.event.entityId,
      summary: row.event.summary,
      detail: row.event.detail,
      metadata: row.event.metadata,
      occurredAt: row.event.occurredAt.toISOString(),
      workspaceId: row.event.workspaceId,
      workspaceName: row.workspaceName,
      taskId: row.event.taskId,
      taskNumber: row.taskNumber,
      taskTitle: row.taskTitle,
      projectId: row.event.projectId,
      projectName: row.projectName,
    })),
    total,
  };
}
