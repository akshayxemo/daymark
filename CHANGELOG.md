# Changelog

All notable changes to Daymark are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Row-level security enabled on every table with no policies, and Supabase `anon`/`authenticated` grants revoked, so hosted Data APIs cannot expose Daymark data (`0001_lock_down_data_api.sql`).
- Mailpit SMTP catcher in Docker Compose (`--profile mail`) and Playwright end-to-end tests that register, verify email and reset passwords through it.
- PostgreSQL persistence with Drizzle ORM: a versioned schema with SQL migrations in `drizzle/`, applied by `pnpm db:migrate`, plus `db:status`, `db:seed` and `db:reset` scripts.
- Per-workspace configurable task statuses, task types and phases, seeded with sensible defaults for every new workspace.
- Authentication with Better Auth: email and password sign-up and sign-in, email verification, password reset, account deletion, rate limiting, and registration modes (`open`, `invite`, `disabled`) with single-user and multi-user deployment modes.
- Multi-user data ownership enforced by composite foreign keys in the database and server-side authorization on every request.
- Versioned REST API under `/api/v1` with Zod-validated inputs and consistent error responses.
- Server-authoritative focus timer with pause and resume and a one-active-timer-per-user constraint.
- Manual time entries with an audit history of edits and overlap detection against existing entries and sessions.
- Planning history and task carry-over between days.
- Development references (repositories, branches, pull requests) and delivery records linked to tasks and projects.
- Append-only activity timeline and audit logs.
- Journal entries, weekly goals and daily reviews.
- Analytics reports for task completion, time investment and focus sessions.
- JSON and CSV export, and import of data from the earlier browser-local demo.
- Public website with SEO metadata, sitemap and security headers.
- Self-hosting with Docker Compose and a multi-stage `Dockerfile` that applies pending migrations on start.
- Continuous integration workflow running typecheck, lint, unit, integration, build and end-to-end tests.
- Community files: contributing guide, code of conduct, security policy, issue and pull request templates.

### Changed

- The dashboard now reads and writes data through the server API instead of browser `localStorage`; a signed-in account is required.
- The `dev` script uses the Next.js Turbopack defaults.

## [0.1.0] - 2026-11-03

### Added

- Interactive dashboard design milestone built from the product specification: overview, tasks, daily and weekly planning, projects, development, sessions, activity, journal, analytics and settings views.
- Browser-local demo data with a local focus timer, activity history and validated JSON export and import.
- Dark and light themes, responsive navigation and global search.
