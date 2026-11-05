import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { taskPhases } from './workspaces';
import { tasks } from './tasks';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const sessionStatuses = ['running', 'paused', 'completed', 'cancelled'] as const;
export type SessionStatus = (typeof sessionStatuses)[number];

/**
 * Timer sessions are server-authoritative. Active time is derived from the
 * persisted intervals in `work_session_intervals`; paused time has no open
 * interval and therefore never counts. A partial unique index guarantees a
 * single running or paused session per user across every workspace.
 */
export const workSessions = pgTable(
  'work_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    taskId: uuid('task_id').notNull(),
    phaseId: uuid('phase_id'),
    status: text('status').notNull().default('running'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** Final active seconds, written when the session completes. */
    durationSeconds: integer('duration_seconds').notNull().default(0),
    description: text('description').notNull().default(''),
    source: text('source').notNull().default('timer'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('work_sessions_one_active_per_user')
      .on(t.userId)
      .where(sql`${t.status} in ('running', 'paused')`),
    index('work_sessions_owner_started_idx').on(t.userId, t.startedAt),
    index('work_sessions_task_idx').on(t.taskId, t.startedAt),
    index('work_sessions_owner_workspace_idx').on(t.userId, t.workspaceId, t.startedAt),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'work_sessions_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.workspaceId, t.phaseId],
      foreignColumns: [taskPhases.workspaceId, taskPhases.id],
      name: 'work_sessions_phase_fk',
    }).onDelete('set null'),
    check(
      'work_sessions_status_check',
      sql`${t.status} in ('running', 'paused', 'completed', 'cancelled')`,
    ),
    check('work_sessions_duration_check', sql`${t.durationSeconds} >= 0`),
    check('work_sessions_source_check', sql`${t.source} in ('timer', 'import')`),
  ],
);

export const workSessionIntervals = pgTable(
  'work_session_intervals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => workSessions.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('work_session_intervals_one_open_per_session')
      .on(t.sessionId)
      .where(sql`${t.endedAt} is null`),
    index('work_session_intervals_session_idx').on(t.sessionId, t.startedAt),
    check(
      'work_session_intervals_order_check',
      sql`${t.endedAt} is null or ${t.endedAt} >= ${t.startedAt}`,
    ),
  ],
);

/** Manually entered time, always distinguishable from timer sessions. */
export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    taskId: uuid('task_id').notNull(),
    phaseId: uuid('phase_id'),
    workDate: date('work_date', { mode: 'string' }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds').notNull(),
    description: text('description').notNull().default(''),
    source: text('source').notNull().default('manual'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('time_entries_owner_date_idx').on(t.userId, t.workDate),
    index('time_entries_task_idx').on(t.taskId, t.workDate),
    index('time_entries_owner_workspace_idx').on(t.userId, t.workspaceId, t.workDate),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'time_entries_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.workspaceId, t.phaseId],
      foreignColumns: [taskPhases.workspaceId, taskPhases.id],
      name: 'time_entries_phase_fk',
    }).onDelete('set null'),
    check('time_entries_duration_check', sql`${t.durationSeconds} > 0`),
    check(
      'time_entries_range_check',
      sql`(${t.startedAt} is null and ${t.endedAt} is null) or (${t.startedAt} is not null and ${t.endedAt} is not null and ${t.endedAt} > ${t.startedAt})`,
    ),
    check('time_entries_source_check', sql`${t.source} in ('manual', 'import')`),
  ],
);

export const timeEntryAudit = pgTable(
  'time_entry_audit',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    timeEntryId: uuid('time_entry_id')
      .notNull()
      .references(() => timeEntries.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    beforeData: jsonb('before_data').$type<Record<string, unknown> | null>(),
    afterData: jsonb('after_data').$type<Record<string, unknown> | null>(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('time_entry_audit_entry_idx').on(t.timeEntryId, t.createdAt),
    check('time_entry_audit_action_check', sql`${t.action} in ('created', 'updated', 'deleted')`),
  ],
);
