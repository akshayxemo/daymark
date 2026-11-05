import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const workspaceKinds = ['professional', 'personal', 'learning', 'custom'] as const;
export type WorkspaceKind = (typeof workspaceKinds)[number];

/**
 * Workspaces are private containers owned by exactly one user. Every
 * workspace-scoped table carries `user_id` and references
 * `(user_id, workspace_id)` so the database itself rejects cross-user links.
 */
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    icon: text('icon').notNull().default('briefcase'),
    color: text('color').notNull().default('accent'),
    kind: text('kind').notNull().default('custom'),
    isDefault: boolean('is_default').notNull().default(false),
    position: integer('position').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('workspaces_owner_id_unique').on(t.userId, t.id),
    uniqueIndex('workspaces_owner_slug_unique').on(t.userId, t.slug),
    index('workspaces_owner_archived_idx').on(t.userId, t.archivedAt),
    check(
      'workspaces_kind_check',
      sql`${t.kind} in ('professional', 'personal', 'learning', 'custom')`,
    ),
  ],
);

export const workspaceSettings = pgTable(
  'workspace_settings',
  {
    workspaceId: uuid('workspace_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** ISO weekday numbers (0 = Sunday … 6 = Saturday) that count as working days. */
    workingDays: jsonb('working_days').$type<number[]>().notNull().default([1, 2, 3, 4, 5]),
    workingMinutesPerDay: integer('working_minutes_per_day').notNull().default(480),
    /** Null inherits the account timezone. */
    timezone: text('timezone'),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'workspace_settings_workspace_fk',
    }).onDelete('cascade'),
    check('workspace_settings_minutes_check', sql`${t.workingMinutesPerDay} between 0 and 1440`),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('active'),
    color: text('color'),
    startDate: date('start_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('projects_owner_workspace_id_unique').on(t.userId, t.workspaceId, t.id),
    uniqueIndex('projects_owner_workspace_name_unique').on(
      t.userId,
      t.workspaceId,
      sql`lower(${t.name})`,
    ),
    index('projects_owner_archived_idx').on(t.userId, t.archivedAt),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'projects_workspace_fk',
    }).onDelete('cascade'),
    check('projects_status_check', sql`${t.status} in ('active', 'on_hold', 'completed')`),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('tags_owner_workspace_id_unique').on(t.userId, t.workspaceId, t.id),
    uniqueIndex('tags_owner_workspace_name_unique').on(
      t.userId,
      t.workspaceId,
      sql`lower(${t.name})`,
    ),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'tags_workspace_fk',
    }).onDelete('cascade'),
  ],
);

export const taskTypes = pgTable(
  'task_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    /** Stable identifier for seeded defaults; null for user-created types. */
    key: text('key'),
    name: text('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    position: integer('position').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('task_types_workspace_id_unique').on(t.workspaceId, t.id),
    uniqueIndex('task_types_workspace_name_unique').on(t.workspaceId, sql`lower(${t.name})`),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'task_types_workspace_fk',
    }).onDelete('cascade'),
  ],
);

export const statusCategories = [
  'not_started',
  'active',
  'paused',
  'waiting',
  'done',
  'closed',
] as const;
export type StatusCategory = (typeof statusCategories)[number];

export const taskStatuses = pgTable(
  'task_statuses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    key: text('key'),
    name: text('name').notNull(),
    category: text('category').notNull(),
    color: text('color'),
    isInitial: boolean('is_initial').notNull().default(false),
    isTerminal: boolean('is_terminal').notNull().default(false),
    isActive: boolean('is_active').notNull().default(false),
    countsAsCompleted: boolean('counts_as_completed').notNull().default(false),
    stopsTimer: boolean('stops_timer').notNull().default(false),
    position: integer('position').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('task_statuses_workspace_id_unique').on(t.workspaceId, t.id),
    uniqueIndex('task_statuses_workspace_name_unique').on(t.workspaceId, sql`lower(${t.name})`),
    uniqueIndex('task_statuses_one_initial_per_workspace')
      .on(t.workspaceId)
      .where(sql`${t.isInitial} = true and ${t.archivedAt} is null`),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'task_statuses_workspace_fk',
    }).onDelete('cascade'),
    check(
      'task_statuses_category_check',
      sql`${t.category} in ('not_started', 'active', 'paused', 'waiting', 'done', 'closed')`,
    ),
  ],
);

export const taskPhases = pgTable(
  'task_phases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    /** Null applies the phase to every task type in the workspace. */
    taskTypeId: uuid('task_type_id'),
    key: text('key'),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    isEnabled: boolean('is_enabled').notNull().default(true),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('task_phases_workspace_id_unique').on(t.workspaceId, t.id),
    index('task_phases_workspace_position_idx').on(t.workspaceId, t.position),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'task_phases_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.workspaceId, t.taskTypeId],
      foreignColumns: [taskTypes.workspaceId, taskTypes.id],
      name: 'task_phases_task_type_fk',
    }).onDelete('set null'),
  ],
);
