# 0001 — Modular monolith on Next.js

**Context.** Daymark has many related domains (tasks, time, planning, delivery, analytics) but one deployable audience: an individual user. It must run on a laptop, a VPS and Vercel.

**Decision.** One Next.js application. Domain logic lives in `src/server/modules/<domain>/service.ts`; route handlers in `src/app/api/v1` only authenticate, validate and delegate. Modules call each other through exported functions, never through HTTP.

**Consequences.** One process, one database, simple deployment and transactions spanning modules (for example a status change that stops the timer). Boundaries are enforced by convention and review rather than by network separation.
