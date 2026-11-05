import { foreignKey, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspaces';
import { tasks } from './tasks';

/**
 * User-facing, append-only activity timeline. The application never updates
 * or deletes rows here through normal operations; corrections are recorded
 * as additional events.
 */
export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id'),
    taskId: uuid('task_id'),
    projectId: uuid('project_id'),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    summary: text('summary').notNull(),
    detail: text('detail').notNull().default(''),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activity_events_owner_time_idx').on(t.userId, t.occurredAt),
    index('activity_events_owner_workspace_time_idx').on(t.userId, t.workspaceId, t.occurredAt),
    index('activity_events_task_time_idx').on(t.taskId, t.occurredAt),
    index('activity_events_project_time_idx').on(t.projectId, t.occurredAt),
    index('activity_events_owner_type_idx').on(t.userId, t.eventType),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'activity_events_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.taskId],
      foreignColumns: [tasks.userId, tasks.id],
      name: 'activity_events_task_fk',
    }).onDelete('cascade'),
  ],
);

/** Sensitive changes and corrections, separate from the user-facing timeline. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    beforeData: jsonb('before_data').$type<Record<string, unknown> | null>(),
    afterData: jsonb('after_data').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_owner_time_idx').on(t.userId, t.createdAt),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  ],
);
