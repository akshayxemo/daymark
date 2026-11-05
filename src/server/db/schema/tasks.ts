import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { projects, tags, taskPhases, taskStatuses, taskTypes, workspaces } from './workspaces';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const priorities = ['low', 'medium', 'high'] as const;
export type Priority = (typeof priorities)[number];

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    projectId: uuid('project_id'),
    parentTaskId: uuid('parent_task_id'),
    taskTypeId: uuid('task_type_id').notNull(),
    statusId: uuid('status_id').notNull(),
    phaseId: uuid('phase_id'),
    /** Per-user sequential number rendered as DM-<number>. */
    taskNumber: integer('task_number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    priority: text('priority').notNull().default('medium'),
    estimatedMinutes: integer('estimated_minutes'),
    /** The current planned date. History lives in task_plans. */
    plannedDate: date('planned_date', { mode: 'string' }),
    dueDate: date('due_date', { mode: 'string' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    position: integer('position').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('tasks_owner_id_unique').on(t.userId, t.id),
    unique('tasks_owner_workspace_id_unique').on(t.userId, t.workspaceId, t.id),
    uniqueIndex('tasks_owner_number_unique').on(t.userId, t.taskNumber),
    index('tasks_owner_workspace_status_idx').on(t.userId, t.workspaceId, t.statusId),
    index('tasks_owner_due_idx').on(t.userId, t.dueDate),
    index('tasks_owner_planned_idx').on(t.userId, t.plannedDate),
    index('tasks_owner_project_idx').on(t.userId, t.projectId),
    index('tasks_owner_parent_idx').on(t.userId, t.parentTaskId),
    index('tasks_owner_archived_idx').on(t.userId, t.archivedAt),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'tasks_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.projectId],
      foreignColumns: [projects.userId, projects.workspaceId, projects.id],
      name: 'tasks_project_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.parentTaskId],
      foreignColumns: [t.userId, t.workspaceId, t.id],
      name: 'tasks_parent_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [t.workspaceId, t.taskTypeId],
      foreignColumns: [taskTypes.workspaceId, taskTypes.id],
      name: 'tasks_task_type_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.workspaceId, t.statusId],
      foreignColumns: [taskStatuses.workspaceId, taskStatuses.id],
      name: 'tasks_status_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [t.workspaceId, t.phaseId],
      foreignColumns: [taskPhases.workspaceId, taskPhases.id],
      name: 'tasks_phase_fk',
    }).onDelete('set null'),
    check('tasks_priority_check', sql`${t.priority} in ('low', 'medium', 'high')`),
    check('tasks_estimate_check', sql`${t.estimatedMinutes} is null or ${t.estimatedMinutes} >= 0`),
    check(
      'tasks_parent_not_self_check',
      sql`${t.parentTaskId} is null or ${t.parentTaskId} <> ${t.id}`,
    ),
    check('tasks_title_check', sql`length(${t.title}) between 1 and 200`),
  ],
);

export const taskTags = pgTable(
  'task_tags',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    taskId: uuid('task_id').notNull(),
    tagId: uuid('tag_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.tagId] }),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'task_tags_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.tagId],
      foreignColumns: [tags.userId, tags.workspaceId, tags.id],
      name: 'task_tags_tag_fk',
    }).onDelete('cascade'),
  ],
);

export const taskDependencies = pgTable(
  'task_dependencies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    /** The task that is blocked. */
    taskId: uuid('task_id').notNull(),
    /** The task it depends on (must finish first). */
    dependsOnTaskId: uuid('depends_on_task_id').notNull(),
    dependencyType: text('dependency_type').notNull().default('blocks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('task_dependencies_unique').on(t.taskId, t.dependsOnTaskId),
    index('task_dependencies_depends_on_idx').on(t.dependsOnTaskId),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'task_dependencies_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.dependsOnTaskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'task_dependencies_depends_on_fk',
    }).onDelete('cascade'),
    check('task_dependencies_not_self_check', sql`${t.taskId} <> ${t.dependsOnTaskId}`),
    check('task_dependencies_type_check', sql`${t.dependencyType} in ('blocks')`),
  ],
);

/**
 * Append-only history. Names are denormalized so the record stays readable
 * even if a custom status is later renamed or archived.
 */
export const taskStatusHistory = pgTable(
  'task_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').notNull(),
    previousStatusId: uuid('previous_status_id'),
    previousStatusName: text('previous_status_name'),
    newStatusId: uuid('new_status_id').notNull(),
    newStatusName: text('new_status_name').notNull(),
    reason: text('reason'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('task_status_history_task_idx').on(t.taskId, t.changedAt),
    foreignKey({
      columns: [t.userId, t.taskId],
      foreignColumns: [tasks.userId, tasks.id],
      name: 'task_status_history_task_fk',
    }).onDelete('cascade'),
  ],
);

export const taskPhaseHistory = pgTable(
  'task_phase_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').notNull(),
    previousPhaseId: uuid('previous_phase_id'),
    previousPhaseName: text('previous_phase_name'),
    newPhaseId: uuid('new_phase_id'),
    newPhaseName: text('new_phase_name'),
    notes: text('notes'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('task_phase_history_task_idx').on(t.taskId, t.changedAt),
    foreignKey({
      columns: [t.userId, t.taskId],
      foreignColumns: [tasks.userId, tasks.id],
      name: 'task_phase_history_task_fk',
    }).onDelete('cascade'),
  ],
);

export const planReasons = ['initial', 'moved', 'carryover', 'unplanned'] as const;
export type PlanReason = (typeof planReasons)[number];

/**
 * Every planning decision is recorded. Moving or carrying a task forward adds
 * a record and never rewrites the original plan.
 */
export const taskPlans = pgTable(
  'task_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').notNull(),
    /** Null when the task was explicitly unplanned. */
    plannedDate: date('planned_date', { mode: 'string' }),
    previousPlannedDate: date('previous_planned_date', { mode: 'string' }),
    plannedMinutes: integer('planned_minutes'),
    planningPeriod: text('planning_period').notNull().default('day'),
    reason: text('reason').notNull().default('initial'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('task_plans_owner_date_idx').on(t.userId, t.plannedDate),
    index('task_plans_task_idx').on(t.taskId, t.createdAt),
    foreignKey({
      columns: [t.userId, t.taskId],
      foreignColumns: [tasks.userId, tasks.id],
      name: 'task_plans_task_fk',
    }).onDelete('cascade'),
    check('task_plans_period_check', sql`${t.planningPeriod} in ('day', 'week')`),
    check(
      'task_plans_reason_check',
      sql`${t.reason} in ('initial', 'moved', 'carryover', 'unplanned')`,
    ),
  ],
);
