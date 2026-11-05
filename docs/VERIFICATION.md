# Verification log

Run on 5 November 2026 on a Windows development machine, Node.js 22, PostgreSQL 17 (Docker), Mailpit 1.27.

| Check                                                                            | Command                                       | Result                                                                   |
| -------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| Types                                                                            | `pnpm typecheck`                              | Pass                                                                     |
| Lint                                                                             | `pnpm lint`                                   | Pass (0 problems)                                                        |
| Unit tests                                                                       | `pnpm test`                                   | 21 passed                                                                |
| Integration tests (real PostgreSQL, schema rebuilt from migrations)              | `pnpm test:integration`                       | 28 passed                                                                |
| End-to-end (production build, real SMTP to Mailpit, desktop and mobile projects) | `pnpm test:e2e`                               | 18 passed                                                                |
| Production build                                                                 | `pnpm build`                                  | Pass; public pages static, `/app` and `/api` dynamic                     |
| Schema drift                                                                     | `pnpm db:generate`                            | "No schema changes"                                                      |
| Docker image                                                                     | `docker build`, run against an empty database | Migrations applied on start, `/api/health` ok, `/app` redirects to login |

## What the end-to-end suite covers

Register → verify email from the inbox → onboarding → create workspace, project and task → change status and phase → re-plan (history shows the move) → start, pause, reload (paused time preserved), resume and stop the timer → manual time → Jira reference → production deployment → complete → activity timeline → analytics → JSON export → second account gets 404 for the first account's task, then restores the export into its own account → password reset via emailed link → signed-out redirects and 401 API responses → public pages (single h1, canonical URL, indexable, no horizontal overflow at phone width) → robots and sitemap exclude private routes → private responses are `no-store` with security headers.

## Not verified

- Resend delivery (requires an account and verified domain).
- Supabase and Vercel (no projects exist yet).
- The GitHub Actions workflow (not yet run on GitHub).
- Screen-reader testing and a formal accessibility audit.
