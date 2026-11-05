# Daymark development plan

## Completed: interactive dashboard design

- [x] Initialize Next.js, React, and TypeScript.
- [x] Configure Tailwind and shadcn-style Button primitives.
- [x] Create a dark dashboard and complete light theme.
- [x] Add responsive shell, workspace navigation, and mobile menu.
- [x] Build overview, tasks, planner, projects, development, time, activity, journal, analytics, and settings views.
- [x] Implement local task capture and editable task side panel.
- [x] Add local status/phase history, task completion, and planning changes.
- [x] Implement local timestamp-based focus timer and persisted sessions.
- [x] Add local workspace/date filters, global search, widget visibility, and weekly intentions.
- [x] Add validated local JSON export/restore.
- [x] Preserve the product specification and document current scope.
- [x] Add timer calculation tests and verify TypeScript and production build.

## Next: foundation and authoritative task lifecycle

- [ ] Introduce Drizzle/PostgreSQL schema and ownership constraints.
- [ ] Implement Better Auth, initial setup, and account registration policy.
- [ ] Create authenticated workspace and project CRUD services.
- [ ] Persist configurable types, statuses, phases, priorities, and tags.
- [ ] Implement task CRUD, status/phase transitions, and event transactions.
- [ ] Replace demo state with service-backed screens.
- [ ] Add server planning records, history-preserving carryover, and review records.
- [ ] Replace local timer with transactional server sessions and concurrency protection.
- [ ] Add meaningful database isolation, concurrent timer, and transition-history tests.

## Subsequent milestones

1. Repository references, branches, deliveries, and production verification.
2. SQL-derived analytics, time entry reconciliation, journals, and reports.
3. Versioned export/import, PostgreSQL backup/restore, and Docker Compose.
4. End-to-end tests, accessibility review, open-source license decision, contribution/security docs, and release packaging.

The supplied specification's 39-item MVP checklist is not marked complete by this design milestone. In particular, account creation, server persistence, and reliable multi-user isolation remain prerequisites to a usable production release.
