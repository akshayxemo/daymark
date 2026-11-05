import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspaces';
import { tasks } from './tasks';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const repositoryProviders = ['github', 'gitlab', 'bitbucket', 'azure', 'other'] as const;
export const referenceTypes = [
  'jira',
  'pull_request',
  'commit',
  'issue',
  'documentation',
  'other',
] as const;
export const deliveryTypes = ['merged', 'deployed', 'verified'] as const;
export const deliveryEnvironments = [
  'development',
  'staging',
  'uat',
  'production',
  'other',
] as const;
export const deliveryStatuses = ['pending', 'successful', 'failed'] as const;
export const branchWorkStatuses = [
  'planned',
  'in_progress',
  'in_review',
  'merged',
  'abandoned',
] as const;

export const repositories = pgTable(
  'repositories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    name: text('name').notNull(),
    owner: text('owner'),
    provider: text('provider').notNull().default('github'),
    repositoryUrl: text('repository_url').notNull().default(''),
    defaultBranch: text('default_branch'),
    description: text('description').notNull().default(''),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('repositories_owner_workspace_id_unique').on(t.userId, t.workspaceId, t.id),
    uniqueIndex('repositories_owner_workspace_name_unique').on(
      t.userId,
      t.workspaceId,
      sql`lower(${t.name})`,
    ),
    foreignKey({
      columns: [t.userId, t.workspaceId],
      foreignColumns: [workspaces.userId, workspaces.id],
      name: 'repositories_workspace_fk',
    }).onDelete('cascade'),
    check(
      'repositories_provider_check',
      sql`${t.provider} in ('github', 'gitlab', 'bitbucket', 'azure', 'other')`,
    ),
  ],
);

/** A task can be worked on in several repositories and branches. */
export const taskRepositories = pgTable(
  'task_repositories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    taskId: uuid('task_id').notNull(),
    repositoryId: uuid('repository_id').notNull(),
    codebaseName: text('codebase_name'),
    branchName: text('branch_name'),
    branchUrl: text('branch_url'),
    workStatus: text('work_status').notNull().default('in_progress'),
    notes: text('notes').notNull().default(''),
    ...timestamps,
  },
  (t) => [
    index('task_repositories_task_idx').on(t.taskId),
    index('task_repositories_repository_idx').on(t.repositoryId),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'task_repositories_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.repositoryId],
      foreignColumns: [repositories.userId, repositories.workspaceId, repositories.id],
      name: 'task_repositories_repository_fk',
    }).onDelete('cascade'),
    check(
      'task_repositories_status_check',
      sql`${t.workStatus} in ('planned', 'in_progress', 'in_review', 'merged', 'abandoned')`,
    ),
  ],
);

export const developmentReferences = pgTable(
  'development_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    taskId: uuid('task_id').notNull(),
    repositoryId: uuid('repository_id'),
    referenceType: text('reference_type').notNull(),
    referenceId: text('reference_id'),
    title: text('title'),
    url: text('url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('development_references_task_idx').on(t.taskId),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'development_references_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.repositoryId],
      foreignColumns: [repositories.userId, repositories.workspaceId, repositories.id],
      name: 'development_references_repository_fk',
    }).onDelete('set null'),
    check(
      'development_references_type_check',
      sql`${t.referenceType} in ('jira', 'pull_request', 'commit', 'issue', 'documentation', 'other')`,
    ),
    check(
      'development_references_content_check',
      sql`coalesce(${t.referenceId}, '') <> '' or coalesce(${t.url}, '') <> ''`,
    ),
  ],
);

/**
 * Merges, deployments and production verifications are separate records.
 * Delivery analytics only count records with delivery_status = 'successful'.
 */
export const deliveryRecords = pgTable(
  'delivery_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    taskId: uuid('task_id').notNull(),
    repositoryId: uuid('repository_id'),
    deliveryType: text('delivery_type').notNull(),
    environment: text('environment').notNull(),
    deliveryStatus: text('delivery_status').notNull().default('successful'),
    branchName: text('branch_name'),
    version: text('version'),
    referenceUrl: text('reference_url'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes').notNull().default(''),
    ...timestamps,
  },
  (t) => [
    index('delivery_records_owner_env_idx').on(t.userId, t.environment, t.deliveredAt),
    index('delivery_records_task_idx').on(t.taskId, t.deliveredAt),
    index('delivery_records_owner_workspace_idx').on(t.userId, t.workspaceId, t.deliveredAt),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.taskId],
      foreignColumns: [tasks.userId, tasks.workspaceId, tasks.id],
      name: 'delivery_records_task_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.userId, t.workspaceId, t.repositoryId],
      foreignColumns: [repositories.userId, repositories.workspaceId, repositories.id],
      name: 'delivery_records_repository_fk',
    }).onDelete('set null'),
    check(
      'delivery_records_type_check',
      sql`${t.deliveryType} in ('merged', 'deployed', 'verified')`,
    ),
    check(
      'delivery_records_environment_check',
      sql`${t.environment} in ('development', 'staging', 'uat', 'production', 'other')`,
    ),
    check(
      'delivery_records_status_check',
      sql`${t.deliveryStatus} in ('pending', 'successful', 'failed')`,
    ),
  ],
);
