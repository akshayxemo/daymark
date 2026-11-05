# Contributing to Daymark

Thanks for your interest in Daymark, an open-source personal work and life intelligence dashboard. This guide explains how to set up a development environment, where things live in the codebase, and what we expect from a change before it is merged.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues must be reported privately as described in [SECURITY.md](SECURITY.md), never in a public issue.

## Prerequisites

- **Node.js 20.9 or newer** (CI and the Docker image use Node 22).
- **pnpm 10**, installed through corepack so the version pinned in `package.json` (`packageManager`) is used:

  ```sh
  corepack enable
  ```

- **Docker** (with Compose v2) to run PostgreSQL locally. Any PostgreSQL 15+ instance works instead if you prefer to manage it yourself.

## Set up a development environment

```sh
git clone https://github.com/akshayxemo/daymark.git
cd daymark

cp .env.example .env.local     # local configuration; never committed
docker compose up -d db        # PostgreSQL 17 on 127.0.0.1:5432
pnpm install                   # dependencies from the locked lockfile
pnpm db:migrate                # apply the SQL migrations in ./drizzle
pnpm db:seed --demo            # optional: a fictional demo account with sample data
pnpm dev                       # http://localhost:3000
```

Notes:

- `.env.example` documents every variable. For local work the defaults already point at the Compose database; set `BETTER_AUTH_SECRET` to any string of at least 32 characters (`openssl rand -base64 32`).
- The Compose init script (`docker/postgres/init/01-create-test-database.sql`) also creates a `daymark_test` database for the integration tests. It runs only when the database volume is first created.
- `pnpm db:seed --demo` refuses to run with `NODE_ENV=production`. The demo credentials are documented in the header of `scripts/db/seed.ts`; change or delete that account before exposing an installation.

## Scripts

| Script                  | What it does                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev`              | Starts the Next.js development server.                                                                                                                 |
| `pnpm build`            | Production build (`output: 'standalone'`, used by the Dockerfile).                                                                                     |
| `pnpm start`            | Serves the production build.                                                                                                                           |
| `pnpm typecheck`        | `tsc --noEmit` over the whole repository.                                                                                                              |
| `pnpm lint`             | ESLint (`eslint.config.mjs`, Next.js core-web-vitals and TypeScript rules).                                                                            |
| `pnpm format`           | Formats everything with Prettier. `pnpm format:check` only reports.                                                                                    |
| `pnpm test`             | Unit tests (`src/**/*.test.ts`) with Vitest. `pnpm test:watch` keeps them running.                                                                     |
| `pnpm test:integration` | Integration tests in `tests/integration` against a real PostgreSQL database. Needs `TEST_DATABASE_URL`; the schema is recreated from `drizzle/` first. |
| `pnpm test:e2e`         | Playwright end-to-end tests against a running application.                                                                                             |
| `pnpm test:all`         | Unit, integration and end-to-end tests in sequence.                                                                                                    |
| `pnpm db:generate`      | Generates a new SQL migration in `drizzle/` from changes to `src/server/db/schema`.                                                                    |
| `pnpm db:migrate`       | Applies pending migrations (uses `DATABASE_URL_UNPOOLED` when set, otherwise `DATABASE_URL`).                                                          |
| `pnpm db:status`        | Lists applied and pending migrations; exits 1 when something is pending.                                                                               |
| `pnpm db:seed`          | Ensures every workspace has its default statuses, task types and phases. `--demo` adds the demo account.                                               |
| `pnpm db:reset`         | Development only: drops everything and re-applies all migrations. Refuses non-local hosts without `--force`.                                           |
| `pnpm db:studio`        | Opens Drizzle Studio to browse the database.                                                                                                           |
| `pnpm check`            | Typecheck, lint, unit tests and build in one go. Run it before opening a pull request.                                                                 |

## Where things live

Daymark is a modular monolith: one Next.js application whose server code is split by domain.

- `src/server/modules/<domain>/service.ts` holds the business logic for a domain (tasks, time, projects, workspaces, activity, journal, analytics, development, users, bootstrap, demo). Services receive a database executor and the server-verified user id; they never read request objects.
- `src/app/api/v1/**` contains the versioned REST route handlers. A handler only validates input with Zod, resolves the session, calls a service and shapes the response through `src/server/http`. No business logic lives in route files.
- `src/lib/validation/*` holds the Zod schemas shared by the API and the UI.
- `src/server/db/schema/*` defines the Drizzle tables; `src/server/db/client.ts` creates the client used by the runtime, the scripts and the tests.
- `drizzle/` contains the generated SQL migrations and their journal. Migrations are the only way the database schema changes.
- `src/server/auth` wires Better Auth (sessions, registration policy, email delivery under `src/server/auth/mail`).
- `src/server/config/env.ts` declares and validates every environment variable. Add new variables there and document them in `.env.example`.
- `src/app/app` holds the authenticated application pages (served under `/app`) and `src/components` the UI (dashboard widgets, page views, shadcn-style primitives in `src/components/ui`). Client code talks to the API through `src/lib/api`.
- `scripts/db/` contains the migration, status, seed and reset tools run through `tsx`.
- `tests/` holds the integration test suite and test helpers; unit tests sit next to the code they cover.

More background: `docs/ARCHITECTURE.md` and `docs/PRODUCT_SPEC.md`.

## Rules that keep the data safe

These are not stylistic preferences; pull requests that break them will not be merged.

1. **Every user-owned query is scoped by the server-verified user id.** Ownership comes from the session, never from the request body or URL. Child rows (statuses, phases, tags, time entries, and so on) are tied to their owner through composite foreign keys, so cross-user references fail at the database as well.
2. **Status and phase changes go through the task service's transactional lifecycle.** Do not update `status_id` or `phase_id` directly; the lifecycle in `src/server/modules/tasks/service.ts` records the transition, stops timers where the status requires it and appends the activity event in one transaction.
3. **Activity events and audit logs are append-only.** Never update or delete them from application code; corrections are new events.
4. **The timer is server-authoritative.** Elapsed time is computed from server timestamps, and a user can have one active timer at a time (enforced by the database). Clients display state; they do not compute it.
5. **Schema changes require a migration.** Edit `src/server/db/schema/*`, run `pnpm db:generate`, review the generated SQL in `drizzle/`, and commit both. Never edit an already-committed migration; add a new one.
6. **Secrets stay out of the repository.** Only `.env.example` is committed, and it contains placeholders.

## Making a change

1. Open an issue first for anything larger than a small fix so the approach can be discussed.
2. Create a branch from `main`. Keep pull requests small and focused; split unrelated changes.
3. Add or update tests for the behaviour you change: unit tests for pure logic, integration tests for services and API routes, end-to-end tests for user flows.
4. Update documentation (`README.md`, `docs/`, `.env.example`) and add a line under `## [Unreleased]` in `CHANGELOG.md` for user-visible changes.
5. Run `pnpm check` (and `pnpm test:integration` when server code changed) before pushing. CI runs typecheck, lint, unit, integration, build and end-to-end tests on every pull request.
6. Fill in the pull request template. Describe what changed, why, and how you tested it.

### Commit messages

Use short, imperative, conventional-style subjects that say what the change does, for example:

```
feat(time): detect overlapping manual entries
fix(auth): rate-limit password reset requests per email
docs: describe the Docker Compose deployment
chore(ci): cache the pnpm store
```

A body is welcome when the reasoning is not obvious from the diff. Reference issues with `Closes #123`.

## Code style

- TypeScript everywhere, `strict` mode, no `any` (ESLint reports it as an error). Unused values must be prefixed with `_`.
- Prettier is the formatter; the configuration in `.prettierrc.json` is single quotes, trailing commas everywhere and a 100-column print width. Run `pnpm format` before committing or let your editor format on save. `.editorconfig` covers the basics for other editors.
- ESLint runs with `pnpm lint`; fix warnings rather than suppressing them.
- Server modules must not import Next.js request APIs, and client components must never import from `src/server` (environment and database access are server-only).
- Prefer small, explicit functions and descriptive names over comments; comment the "why" when it is not obvious.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE) that covers the project.
