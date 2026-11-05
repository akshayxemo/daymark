import type { DbExecutor } from '@/server/db/client';
import { activityEvents, auditLogs } from '@/server/db/schema';

export type ActivityInput = {
  userId: string;
  workspaceId?: string | null;
  taskId?: string | null;
  projectId?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

/** Appends a user-facing timeline event. Never updates or deletes. */
export async function recordActivity(db: DbExecutor, input: ActivityInput) {
  const [row] = await db
    .insert(activityEvents)
    .values({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      detail: input.detail ?? '',
      metadata: input.metadata ?? {},
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning();
  return row!;
}

export type AuditInput = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

/** Appends an audit record for sensitive changes and corrections. */
export async function recordAudit(db: DbExecutor, input: AuditInput) {
  await db.insert(auditLogs).values({
    userId: input.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    beforeData: input.before ?? null,
    afterData: input.after ?? null,
  });
}
