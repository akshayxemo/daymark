# Daymark architecture

Daymark is a **modular monolith**: one Next.js application, one PostgreSQL database, clear module boundaries inside the codebase. The product specification is in [PRODUCT_SPEC.md](PRODUCT_SPEC.md); significant decisions are recorded in [adr/](adr/).

## Stack

| Layer                | Choice                                                                                |
| -------------------- | ------------------------------------------------------------------------------------- |
| Framework            | Next.js 16 App Router, React 19, TypeScript (strict)                                  |
| UI                   | Tailwind CSS 4, shadcn-style primitives (`src/components/ui`), Lucide icons, Recharts |
| Client server-state  | TanStack Query (`src/lib/api/queries.ts`)                                             |
| Forms and validation | React Hook Form + Zod (schemas shared by client and server in `src/lib/validation`)   |
| Database             | PostgreSQL 17 via Drizzle ORM and `postgres.js`                                       |
| Authentication       | Better Auth (email + password, database sessions)                                     |
| Email                | Resend HTTP API, any SMTP server (Nodemailer), or a console transport for development |
| Tests                | Vitest (unit, integration against real PostgreSQL), Playwright (end-to-end)           |

## Request flow

```
Browser ──► src/proxy.ts            optimistic cookie check, redirects only (no authorization)
        ──► src/app/app/**          Server Component layout verifies the session in the database,
                                    loads the bootstrap payload, renders the client shell
        ──► src/app/api/v1/**       Route handlers: authenticate, parse with Zod, call a service
                ──► src/server/modules/<domain>/service.ts   business rules and transactions
                        ──► src/server/db (Drizzle)          parameterised SQL only
```

- **Route handlers never contain business logic.** `authenticated()` in `src/server/http/handler.ts` resolves the session, and the handler passes `session.user.id` to a service. Client-supplied user identifiers are never read.
- **Services own the rules.** Every query includes `user_id = <session user>`. Lookups of records that are missing _or_ owned by someone else both raise `NotFoundError`, so identifiers cannot be probed.
- **Errors** are `AppError` subclasses with a status and code (`src/server/http/errors.ts`). Anything else becomes a generic 500 and is logged without user content (`src/server/logging.ts`).
- **Responses** are `{ data }` or `{ error: { code, message, details } }`, always `Cache-Control: private, no-store`.

## Modules (`src/server/modules`)

| Module        | Responsibility                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `users`       | Account settings, task numbering, invitations                                                                                       |
| `workspaces`  | Workspaces, per-workspace statuses, task types, phases, tags, working hours; default configuration                                  |
| `projects`    | Project lifecycle and archive                                                                                                       |
| `tasks`       | Task CRUD, subtasks, dependencies (cycle-checked), the transactional status/phase lifecycle, planning history and carryover, search |
| `time`        | Server-authoritative timer (`engine.ts`), manual entries with audit and overlap detection, aggregation                              |
| `development` | Repositories, task–repository links and branches, external references, delivery records                                             |
| `journal`     | Journal entries (Markdown), weekly goals, daily notes and reviews                                                                   |
| `activity`    | Append-only timeline writes (`record.ts`) and filtered reads                                                                        |
| `analytics`   | Overview and report metrics computed from records with SQL aggregation                                                              |
| `data`        | JSON export, transactional restore, CSV export, import of the old browser-local prototype data                                      |
| `bootstrap`   | One payload for the shell: workspaces, configuration, settings, timer                                                               |
| `demo`        | Fictional demo seed (development only)                                                                                              |

## Key mechanisms

**Ownership.** Every user-owned table carries `user_id`, and child tables reference parents through composite foreign keys such as `(user_id, workspace_id, project_id) → projects(user_id, workspace_id, id)`. The database therefore rejects a task that points at another user's project even if a service had a bug. See [DATABASE.md](DATABASE.md).

**Task lifecycle.** `changeTaskStatus` runs in one transaction: lock the task row, validate the target status belongs to the task's workspace, read the previous status, update, insert `task_status_history`, insert activity events (`task.status_changed`, `task.completed`), write an audit record when a terminal task is reopened, and stop the timer if the new status has `stops_timer`. Any failure rolls everything back. Phase changes and planning changes follow the same pattern.

**Timer.** A session is a set of intervals (`work_session_intervals`). Active time is the sum of closed intervals plus the open one measured on the server; paused time has no open interval and never counts. A partial unique index allows one `running` or `paused` session per user, and every timer operation first locks the user's settings row (`SELECT … FOR UPDATE`) so concurrent starts serialise. The browser only animates the clock from the server's value.

**History.** Planning moves insert `task_plans` rows (initial, moved, carryover, unplanned) rather than overwriting the original plan. Activity events are insert-only. Manual time edits write `time_entry_audit` before/after snapshots; manual entries are soft-deleted.

**Rendering and caching.** Public pages (`src/app/(public)`) are static Server Components with no session access. Everything under `/app` and `/api` is dynamic, marked `noindex`, and sent with `Cache-Control: private, no-store`. TanStack Query keeps client state per browser tab; mutations invalidate the affected query families (`useApiMutation`).

## Directory map

```
src/app/(public)      landing, features, docs, privacy, terms
src/app/(auth)        login, register, password reset, verification, onboarding
src/app/app           authenticated application (one page per section)
src/app/api/v1        versioned REST API; /api/auth is Better Auth; /api/health
src/components/app    shell, cards, task drawer, pages
src/lib               client-safe helpers: API client, validation, dates, site config
src/server            server-only: config, auth, db, http helpers, modules
drizzle/              generated SQL migrations (version controlled)
scripts/db            migrate, status, seed, reset
tests/integration     Vitest against PostgreSQL
tests/e2e             Playwright against the production build + Mailpit
```

## Not in scope for the MVP

Team workspaces and sharing, external GitHub/Jira APIs, recurring tasks, offline/PWA sync, and the publisher analytics dashboard (see [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)).
