import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Better Auth identity tables. Property names must match Better Auth's model
 * fields. Better Auth generates text IDs for these tables.
 */
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    /** The first account created on an installation becomes the owner. */
    role: text('role').notNull().default('member'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('user_email_unique').on(t.email),
    check('user_role_check', sql`${t.role} in ('owner', 'member')`),
  ],
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('session_token_unique').on(t.token), index('session_user_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

/** Database-backed rate limiting so limits hold across serverless instances. */
export const rateLimit = pgTable(
  'rate_limit',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    count: integer('count').notNull().default(0),
    lastRequest: bigint('last_request', { mode: 'number' }).notNull().default(0),
  },
  (t) => [index('rate_limit_key_idx').on(t.key)],
);

/** Invitation codes used when REGISTRATION_MODE=invite. */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(),
    email: text('email'),
    invitedByUserId: text('invited_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    usedByUserId: text('used_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('invitations_code_unique').on(t.code)],
);

export type DashboardPreferences = {
  hiddenWidgets?: string[];
  period?: 'today' | 'week' | 'month';
  workspaceFilter?: string;
};

export const userSettings = pgTable(
  'user_settings',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    timezone: text('timezone').notNull().default('UTC'),
    dateFormat: text('date_format').notNull().default('yyyy-MM-dd'),
    timeFormat: text('time_format').notNull().default('24h'),
    weekStartsOn: smallint('week_starts_on').notNull().default(1),
    theme: text('theme').notNull().default('dark'),
    defaultWorkspaceId: uuid('default_workspace_id'),
    /** Flexible per-user dashboard preferences (widget visibility, filters). */
    dashboard: jsonb('dashboard').$type<DashboardPreferences>().notNull().default({}),
    /** Per-user counter used to assign readable task numbers (e.g. DM-104). */
    nextTaskNumber: integer('next_task_number').notNull().default(1),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check('user_settings_week_start_check', sql`${t.weekStartsOn} between 0 and 6`),
    check('user_settings_time_format_check', sql`${t.timeFormat} in ('24h', '12h')`),
    check('user_settings_theme_check', sql`${t.theme} in ('dark', 'light', 'system')`),
  ],
);

/** Records completed imports of browser-local demo data to prevent duplicates. */
export const localImports = pgTable(
  'local_imports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    summary: jsonb('summary').$type<Record<string, number>>().notNull().default({}),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('local_imports_user_fingerprint_unique').on(t.userId, t.fingerprint)],
);
