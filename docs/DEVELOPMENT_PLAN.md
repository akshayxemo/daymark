# Development plan and status

Status as of 5 November 2026 (version 0.2.0). "Verified" means covered by an automated test that passed, or checked by hand where stated.

## Completed and verified

| Area                                               | Notes                                                                                                                                                                                      | Verified by                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| PostgreSQL schema, migrations, seed, reset, status | 36 tables, composite ownership keys, constraints, indexes; two migrations                                                                                                                  | Integration suite rebuilds from migrations; `drizzle-kit generate` reports no drift |
| Environment validation                             | Zod, all problems reported at once, production rules                                                                                                                                       | `env.test.ts`                                                                       |
| Better Auth                                        | Registration, verification, login, logout, reset, change password, sessions list/revoke, account deletion with confirmation, rate limits                                                   | `auth.test.ts`; e2e register → verify → onboard, reset password                     |
| Registration modes                                 | open, invite (codes, single use), disabled, single-user                                                                                                                                    | `auth.test.ts`                                                                      |
| Email                                              | Resend, SMTP, console (dev only)                                                                                                                                                           | e2e against Mailpit over real SMTP. Resend not exercised (needs an account).        |
| Multi-user isolation                               | Service scoping, 404 for foreign records, database rejects cross-account references                                                                                                        | `tasks.test.ts`, `workspaces.test.ts`, e2e cross-account test                       |
| Workspaces                                         | CRUD, archive/restore (keeps history), defaults per kind, custom statuses/types/phases/tags, working days and hours                                                                        | `workspaces.test.ts`; e2e                                                           |
| Projects and tasks                                 | CRUD, subtasks, dependencies with cycle check, duplication, archive/restore, tags, priorities, planned/due dates, estimates, search, filters, sorting, pagination                          | `tasks.test.ts`; e2e                                                                |
| Lifecycle history                                  | Transactional status and phase changes with history, events, audit, timer stop                                                                                                             | `tasks.test.ts`, `timer.test.ts`                                                    |
| Planning                                           | Daily planner, weekly planner (drag and drop), carryover preserving original plans, weekly goals, daily notes and end-of-day review                                                        | `tasks.test.ts`; e2e re-plan                                                        |
| Time tracking                                      | Server timer start/pause/resume/stop/cancel, survives reload, one active timer under concurrency, manual entries with audit and overlap rejection or explicit reconciliation, daily totals | `timer.test.ts`; e2e timer cycle including reload                                   |
| Development tracking                               | Repositories, task–repository links and branches, Jira/PR/commit/docs references                                                                                                           | e2e reference; service code                                                         |
| Deliveries                                         | Merge, deploy, verify per environment and outcome; only successful records counted                                                                                                         | `analytics.test.ts`; e2e                                                            |
| Activity timeline                                  | Append-only events, global/task/project/workspace views, type and date filters                                                                                                             | e2e activity page                                                                   |
| Journal                                            | Markdown entries (raw HTML disabled), types, tags, task and project links, search                                                                                                          | Service code; manual review                                                         |
| Analytics                                          | Overview widgets, completion, workspace/project/phase distribution, estimate vs actual, carryover trend, calendar and active cycle time, delivery and verification rates                   | `analytics.test.ts`                                                                 |
| Data                                               | JSON export, transactional restore with fresh IDs, CSV exports, browser-prototype import                                                                                                   | `data.test.ts`, `pure.test.ts`; e2e export → restore into another account           |
| Public website and SEO                             | Landing, features, docs, privacy, terms, metadata, canonical, Open Graph image, JSON-LD, sitemap, robots, manifest, icon                                                                   | e2e `public.spec.ts` (desktop and mobile widths, no horizontal overflow)            |
| Security                                           | See [SECURITY.md](SECURITY.md)                                                                                                                                                             | Mixed: tests plus review                                                            |
| Docker                                             | Image builds, applies migrations on start, health check                                                                                                                                    | Built and run locally against a fresh database                                      |
| CI                                                 | Typecheck, lint, unit, integration (PostgreSQL service), build, e2e (PostgreSQL and Mailpit services)                                                                                      | Workflow written; **not yet run on GitHub**                                         |

## Partially completed

- **Dashboard customisation:** widget visibility, saved workspace filter and period are saved per account. Drag-and-drop layouts are not implemented.
- **Accessibility:** semantic landmarks, labelled controls, keyboard-reachable dialogs, chart text alternatives. No formal WCAG audit with assistive technology has been done.
- **Responsive layout:** public pages tested at phone width by e2e. The app shell keeps the earlier responsive design but was not re-tested at every width after the rewrite.

## Requires external configuration

Supabase projects, Vercel project and domain, email provider account and DNS. Step-by-step: [SUPABASE_SETUP.md](SUPABASE_SETUP.md), [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

## Not implemented

- Publisher/admin aggregate analytics dashboard (no usage data is collected).
- Task templates.
- Content security policy header, multi-factor authentication.

## Deferred (post-MVP)

Recurring tasks, calendar integration, GitHub/Jira API sync, PWA and offline capture, AI summaries, shared/team workspaces, public portfolio, import from other tools, career history report.
