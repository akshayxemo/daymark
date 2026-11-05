# Database

Daymark uses standard PostgreSQL (tested with 17). The schema is defined in TypeScript with Drizzle (`src/server/db/schema/*.ts`) and shipped as version-controlled SQL migrations in `drizzle/`. Nothing depends on a specific hosting provider.

## Commands

| Command               | What it does                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:migrate`     | Applies pending migrations. Idempotent. Uses `DATABASE_URL_UNPOOLED` when set, otherwise `DATABASE_URL`.                                                  |
| `pnpm db:status`      | Lists applied and pending migrations; exits 1 when something is pending (useful in CI and deploy checks).                                                 |
| `pnpm db:seed`        | Ensures every workspace has its default statuses, task types and phases. Safe to repeat.                                                                  |
| `pnpm db:seed --demo` | Also creates a fictional demo account `demo@daymark.local` (password from `DEMO_PASSWORD`, see `scripts/db/seed.ts`). Refused with `NODE_ENV=production`. |
| `pnpm db:reset`       | **Development only.** Drops the schema and re-applies all migrations. Refuses non-local hosts unless `--force`.                                           |
| `pnpm db:generate`    | After changing `src/server/db/schema`, generates a new SQL migration. Commit it.                                                                          |
| `pnpm db:studio`      | Drizzle Studio for browsing data locally.                                                                                                                 |

New accounts receive their configuration automatically: creating a workspace inserts its default statuses, task types and phases in the same transaction. The seed is a repair and demo tool, not a required setup step.

### Local database

```bash
docker compose up -d db
```

The container listens on `127.0.0.1:5432` only (change with `POSTGRES_PORT`). On first start it also creates `daymark_test` for the integration suite (`docker/postgres/init`).

## Migrations

| File                          | Content                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0000_initial_schema.sql`     | All tables, composite foreign keys, unique and check constraints, indexes.                                                                                                         |
| `0001_lock_down_data_api.sql` | Enables row-level security on every table and revokes `anon`/`authenticated` grants where those roles exist (Supabase). See [SUPABASE_SETUP.md](SUPABASE_SETUP.md#security-model). |

Safe practice:

1. Change the schema, run `pnpm db:generate`, read the generated SQL.
2. Run `pnpm test:integration`. The suite rebuilds its database from the migration files, so it proves they apply cleanly from empty.
3. Commit schema and migration together. Never edit an applied migration; add a new one.
4. Back up production before applying (`pg_dump`, below), then run `pnpm db:migrate` with the direct connection.

New tables must also get row-level security; `tests/integration/schema.test.ts` fails if any public table lacks it.

## Entity overview

```
user ─┬─ session, account, verification        (Better Auth)
      ├─ user_settings                          timezone, week start, theme, dashboard prefs, task counter
      ├─ invitations                            invite-only registration codes
      └─ workspaces ─┬─ workspace_settings      working days/hours, timezone override
                     ├─ task_statuses           flags: is_initial, is_active, is_terminal, counts_as_completed, stops_timer
                     ├─ task_types
                     ├─ task_phases             optionally scoped to a task type
                     ├─ tags
                     ├─ projects
                     ├─ repositories
                     └─ tasks ─┬─ tasks (parent_task_id)       subtasks
                               ├─ task_tags
                               ├─ task_dependencies            one direction, no self, no duplicates; cycles checked in the service
                               ├─ task_status_history          append-only, names denormalised
                               ├─ task_phase_history           append-only
                               ├─ task_plans                   every planning decision (initial/moved/carryover/unplanned)
                               ├─ work_sessions ── work_session_intervals
                               ├─ time_entries ── time_entry_audit
                               ├─ task_repositories            branch, codebase, work status
                               ├─ development_references       Jira, PR, commit, issue, docs, other
                               └─ delivery_records             merged / deployed / verified × environment × outcome
weekly_goals, daily_reviews, journal_entries (+ journal_entry_tags, journal_entry_tasks)
activity_events (append-only timeline), audit_logs (sensitive changes), local_imports (import de-duplication)
```

Conventions: UUID primary keys (Better Auth tables use its text IDs), `timestamptz` everywhere, durations in integer seconds or minutes, calendar dates as `date`, soft archive (`archived_at`) for workspaces, projects, tasks, repositories and journal entries. JSONB is used only for flexible configuration and event metadata.

## Integrity rules enforced by the database

- Composite foreign keys keep every child in its owner's workspace (tasks → workspace, project, status, type, phase; links → repositories; sessions and entries → tasks).
- `work_sessions_one_active_per_user`: unique `(user_id)` where status is `running` or `paused`.
- `work_session_intervals_one_open_per_session`: at most one open interval per session.
- Unique names per workspace (case-insensitive) for projects, tags, statuses, task types, repositories; unique task number per user; one initial status per workspace.
- Check constraints on enums (priority, statuses, delivery types/environments/outcomes, reference types), non-negative durations, valid time ranges, rating 1–5.
- Deleting a user cascades to everything they own.

## Connections

`src/server/db/client.ts` creates the pool with `prepare: false` (required behind transaction-mode poolers), small pool sizes on Vercel (`max: 2`) and short idle timeouts. Supabase transaction-pooler connections (port 6543) also use `max_pipeline: 1`: overlapping queries on one connection can stall in Supavisor, leaving login and dashboard requests waiting for minutes. Queries still run concurrently on separate connections. The runtime uses `DATABASE_URL`; migrations use `DATABASE_URL_UNPOOLED` when present. Append `?sslmode=require` for hosted databases.

## Backup and restore

A full backup is a PostgreSQL dump. The in-app JSON export is **not** a database backup: it covers one account and omits authentication data.

```bash
# Backup (custom format, compressed)
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL_UNPOOLED" --file daymark-$(date +%F).dump

# Restore into an empty database, then confirm migrations are current
pg_restore --no-owner --no-privileges --dbname "$TARGET_DATABASE_URL" daymark-2026-11-05.dump
pnpm db:status
```

With Docker Compose:

```bash
docker compose exec -T db pg_dump -U daymark --format=custom daymark > daymark.dump
docker compose exec -T db pg_restore -U daymark --dbname daymark --clean --if-exists < daymark.dump
```

Use a direct (not transaction-pooled) connection for `pg_dump`. Test restores periodically into a scratch database.

### Application-level export and import

- **Settings → Export JSON** downloads a schema-versioned archive (`format: "daymark-export"`, `version: 1`) of every record the account owns.
- **Settings → Restore from an export** validates the archive (structure, identifiers, every internal reference), then inserts it in one transaction with fresh identifiers, ownership forced to the current account, and task numbers re-allocated. Workspace slugs that clash are renamed "(imported)". Running timers in the archive are closed. Any invalid record rolls back the whole import. The same archive cannot be imported twice into one account.
- **CSV** exports exist for tasks, time, deliveries and activity. Cells starting with `=`, `+`, `-` or `@` are prefixed to prevent spreadsheet formula injection.
- **Browser prototype data** (`localStorage` key `daymark.design.v1`) is detected on the Settings page, previewed, and imported only on request. The built-in fictional sample tasks are skipped unless explicitly included. The browser copy is kept until the user removes it.
