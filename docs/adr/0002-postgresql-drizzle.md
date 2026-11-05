# 0002 — PostgreSQL with Drizzle and SQL migrations

**Context.** The domain is strongly relational and analytics need aggregation. The same schema must work on self-hosted PostgreSQL and Supabase.

**Decision.** PostgreSQL, Drizzle ORM schema in TypeScript, generated SQL migrations committed under `drizzle/`, applied by `pnpm db:migrate` (Drizzle's migrator). `postgres.js` with `prepare: false` so transaction poolers work.

**Consequences.** Migrations are reviewable SQL and run without any provider console. Custom SQL (such as the RLS lockdown) is added as custom migrations. Integration tests rebuild their database from these files, proving they apply from empty.
