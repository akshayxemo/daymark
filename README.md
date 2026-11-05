# Daymark

A personal work and life intelligence dashboard. This repository contains the **interactive dashboard design milestone**, built locally from the supplied Daymark product specification.

## Run locally

Requires Node.js 20.9+ and pnpm.

```sh
cd /Users/akshaykumardas/Desktop/Personal/daymark
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. The development server uses Webpack with polling because Turbopack's FSEvent watcher failed on this machine. It listens only on the local loopback interface.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## Explore the design

- Dark default and a complete light theme, plus responsive navigation.
- Overview with task completion, time investment, focus sessions, and a sample delivery metric.
- Scope the dashboard to Office, Personal, Learning, or all workspaces.
- Time reports use Today, This week (Monday onward), or This month.
- Create tasks, mark them complete, and edit status, phase, priority, or planned date in a side panel.
- Task changes append entries to local activity history.
- Start, pause, resume, and stop one local focus timer. Timestamps and accumulated active time survive browser refresh. Starting another task saves the previous session; a timer-stopping status also saves it.
- Navigate tasks, daily planning, weekly planning, projects, development, sessions, activity, journal, analytics, and settings.
- Create and edit workspace-specific projects, assign tasks to them, and safely archive or restore projects while keeping their tasks and history. Older browser data and exports are migrated from task project names.
- Drag a task to another day in the weekly planner. Each move records the previous and new planned dates in activity; open the task and edit its planned date for keyboard or touch use.
- Use Command/Ctrl+K for global task and page search.
- Toggle weekly intentions and dashboard widgets.
- Export and restore a validated JSON copy through Settings.

## Data and milestone boundary

The app starts with fictional sample projects, sessions, activity, and a production delivery. The demo badge identifies this experience. No account or external service is required. Browser localStorage stores the demo under `daymark.design.v1`. New sessions and edits persist in that browser and origin; use the same URL consistently.

This is **not the production MVP**. There is no PostgreSQL connection, authentication, authorization, durable server audit log, manual time-entry reconciliation, backup service, or production deployment yet. Timers are based on browser/device timestamps and do not guarantee cross-tab or cross-device concurrency. The fixed sample delivery log is for interface design. Journal and intentions are account-wide demo preferences, while task, time, and activity views honor workspace scope. Tasks completed in the summary are explicitly today's planned tasks; time metrics honor the report date filter.

Browser storage can be cleared or tampered with and should not hold sensitive production data. JSON import replaces this local demo after validating its schema and relationships. Export first if you want to preserve existing changes.

## Structure

- `src/app/(dashboard)`: App Router routes with a persistent shared dashboard layout. Sections have direct URLs such as `/planner`, `/projects`, and `/tasks`.
- `src/components/dashboard.tsx`: Dashboard shell and section composition.
- `src/components/pages`: Planner, projects, development, and settings views.
- `src/components/dashboard`: Shared cards, dialogs, widgets, and the browser state controller.
- `src/lib/routes.ts`: Section-to-URL mapping used for navigation and static routes.
- `src/lib/dashboard-state.ts`: Timer finalization and saved-data validation.
- `src/components/ui/button.tsx`: shadcn-style Button, Radix Slot, and class variants.
- `src/lib/model.ts`: Typed demo records, configurable status definitions, and timer calculations.
- `src/lib/model.test.ts`: Focus timer persistence, pause/resume, and clock edge cases.
- `docs/PRODUCT_SPEC.md`: Original user-supplied specification, preserved verbatim.
- `docs/ARCHITECTURE.md`: Production boundaries and the current design implementation.
- `docs/DEVELOPMENT_PLAN.md`: Completed design work and the next implementation milestones.

Next.js, React, TypeScript, Tailwind CSS, Radix/shadcn conventions, Lucide, and Recharts are used in this milestone. Dependencies are locked in `pnpm-lock.yaml`. No external fonts, images, or analytics are loaded by the app.
