import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { projects, tags, workspaces } from './workspaces';
import { tasks } from './tasks';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const goalStatuses = ['planned', 'in_progress', 'completed', 'dropped'] as const;
export const journalEntryTypes = [
  'daily_review',
  'technical',
  'personal',
  'meeting',
  'learning',
  'achievement',
  'blocker',
  'general',
] as const;
export type JournalEntryType = (typeof journalEntryTypes)[number];

export const weeklyGoals = pgTable(
  'weekly_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Null means the goal spans every workspace. */
    workspaceId: uuid('workspace_id'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    weekStartDate: date('week_start_date', { mode: 'string' }).notNull(),
    weekEndDate: date('week_end_date', { mode: 'string' }).notNull(),
    status: text('status').notNull().default('planned'),
    position: integer('position').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('weekly_goals_owner_week_idx').on(t.userId, t.weekStartDate),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'weekly_goals_workspace_fk',
    }).onDelete('cascade'),
    check(
      'weekly_goals_status_check',
      sql`${t.status} in ('planned', 'in_progress', 'completed', 'dropped')`,
    ),
    check('weekly_goals_range_check', sql`${t.weekEndDate} >= ${t.weekStartDate}`),
  ],
);

/** One record per user and day: the day's note plus the end-of-day review. */
export const dailyReviews = pgTable(
  'daily_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id'),
    reviewDate: date('review_date', { mode: 'string' }).notNull(),
    notes: text('notes').notNull().default(''),
    accomplishments: text('accomplishments').notNull().default(''),
    blockers: text('blockers').notNull().default(''),
    learnings: text('learnings').notNull().default(''),
    tomorrowPriorities: text('tomorrow_priorities').notNull().default(''),
    /** Optional 1–5 self-rating of the day. */
    rating: smallint('rating'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('daily_reviews_owner_date_workspace_unique').on(
      t.userId,
      t.reviewDate,
      sql`coalesce(${t.workspaceId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'daily_reviews_workspace_fk',
    }).onDelete('cascade'),
    check('daily_reviews_rating_check', sql`${t.rating} is null or ${t.rating} between 1 and 5`),
  ],
);

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id'),
    projectId: uuid('project_id'),
    title: text('title').notNull(),
    /** Markdown. Rendered without raw HTML so content is never interpreted as markup. */
    content: text('content').notNull().default(''),
    entryType: text('entry_type').notNull().default('general'),
    entryDate: date('entry_date', { mode: 'string' }).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('journal_entries_owner_date_idx').on(t.userId, t.entryDate),
    index('journal_entries_owner_workspace_idx').on(t.userId, t.workspaceId, t.entryDate),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'journal_entries_workspace_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.projectId],
      foreignColumns: [projects.userId, projects.workspaceId, projects.id],
      name: 'journal_entries_project_fk',
    }).onDelete('set null'),
    check(
      'journal_entries_type_check',
      sql`${t.entryType} in ('daily_review', 'technical', 'personal', 'meeting', 'learning', 'achievement', 'blocker', 'general')`,
    ),
  ],
);

export const journalEntryTags = pgTable(
  'journal_entry_tags',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] })],
);

export const journalEntryTasks = pgTable(
  'journal_entry_tasks',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.taskId] }),
    foreignKey({
      columns: [t.userId, t.taskId],
      foreignColumns: [tasks.userId, tasks.id],
      name: 'journal_entry_tasks_task_fk',
    }).onDelete('cascade'),
  ],
);
