# 0005 — Better Auth; RLS as a deny-all lockdown, not per-user policies

**Context.** Supabase offers Auth and row-level security tied to its JWTs. Daymark must also run without Supabase, and uses pooled connections from serverless functions.

**Decision.** Better Auth manages identity and database sessions everywhere. Row-level security is enabled on all tables with no policies, which blocks Supabase's `anon`/`authenticated` Data API roles while the owner connection used by the app is unaffected. User isolation is enforced by services and composite foreign keys (ADR 0003).

**Consequences.** One authentication system, provider-independent. We avoid per-user policies that would rely on a session variable set on pooled connections, which could leak between requests and give a false sense of security.
