# Daymark architecture

## Baseline

The supplied product specification remains the source of truth: Next.js + React + TypeScript, PostgreSQL + Drizzle, Better Auth, Zod, Tailwind + shadcn/ui, Recharts, and Docker Compose. The production application is a modular monolith with private user-owned workspaces. No hosting provider or external API is required for core features.

## Current implementation: dashboard design

The App Router serves a client-side interactive design preview. A typed state object holds sample tasks, sessions, events, a local timer, journal text, weekly intentions, and preferences. localStorage provides browser-only persistence. State is validated on load and import. React renders text safely; imported strings are not interpreted as HTML.

Tasks and events reference a workspace; sessions resolve scope through their task. Status definitions expose completion and timer-stop behavior. UI changes append activity entries. The timer calculates active seconds from a persisted start timestamp plus accumulated seconds, excluding paused intervals. A terminal/timer-stopping task transition saves its active session. This gives useful design behavior while preserving the production distinction between browser counters and server-authoritative timing.

The current `dashboard.tsx` intentionally keeps navigation and the state controller together for the design milestone. Extract domain modules and route-level screens as the backend is introduced, keeping the shared shell, design tokens, and components.

## Production implementation still required

1. Identity: Better Auth with first-user setup and explicit registration settings. All route handlers and services derive user ownership from a verified server session.
2. Ownership: PostgreSQL composite ownership keys and foreign-key relationships must reject cross-user and cross-workspace associations. Apply ownership predicates in repositories as well as authorization in services.
3. Lifecycle: Update task status/phase and insert corresponding history and append-only events within one transaction. Preserve original planning and add carryover records.
4. Time: Use server timestamps, a database constraint allowing one active session per user, and transactional start/pause/resume/stop operations. Reconcile overlap with manual entries. Test concurrent starts and clock-independent duration calculation.
5. Delivery: Separate completed tasks, merges, deployments, and production verification. Compute reporting from successful records and explicit eligible task sets.
6. Persistence: Replace the local state controller with authenticated services backed by Drizzle migrations. Keep relational business entities out of JSONB configuration fields.
7. Operations: Compose web/db services, non-public PostgreSQL port, database health checks, backup/restore validation, schema-versioned exports, and documented migration steps.

## Preview limitations

The browser owns all demo state. There is no production data isolation, immutable server audit store, or cross-tab timer exclusion. Sample development and delivery records are illustrative. Imports are local design exports, not PostgreSQL backups. No server architecture decision was replaced by browser storage.
