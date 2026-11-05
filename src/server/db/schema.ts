import { pgTable, text, timestamp, boolean, uuid, uniqueIndex, foreignKey, integer } from 'drizzle-orm/pg-core';

// Better Auth requires its own user, session, account and verification tables.
// Text IDs here follow Better Auth's default ID generator.
export const user = pgTable('user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false), image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const session = pgTable('session', {
  id: text('id').primaryKey(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), ipAddress: text('ip_address'), userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});
export const account = pgTable('account', {
  id: text('id').primaryKey(), accountId: text('account_id').notNull(), providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'), refreshToken: text('refresh_token'), idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }), refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'), password: text('password'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const verification = pgTable('verification', {
  id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(), userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), archivedAt: timestamp('archived_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('workspaces_owner_id_idx').on(t.userId, t.id)]);
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(), userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), workspaceId: uuid('workspace_id').notNull(),
  name: text('name').notNull(), description: text('description').notNull().default(''), archivedAt: timestamp('archived_at', { withTimezone: true }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('projects_owner_workspace_id_idx').on(t.userId, t.workspaceId, t.id), foreignKey({ columns: [t.userId, t.workspaceId], foreignColumns: [workspaces.userId, workspaces.id] })]);
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(), userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), workspaceId: uuid('workspace_id').notNull(), projectId: uuid('project_id'),
  title: text('title').notNull(), description: text('description').notNull().default(''), status: text('status').notNull().default('planned'), priority: text('priority').notNull().default('Medium'),
  phase: text('phase'), estimateMinutes: integer('estimate_minutes'), plannedDate: text('planned_date'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (t) => [foreignKey({ columns: [t.userId, t.workspaceId], foreignColumns: [workspaces.userId, workspaces.id] }), foreignKey({ columns: [t.userId, t.workspaceId, t.projectId], foreignColumns: [projects.userId, projects.workspaceId, projects.id] })]);
