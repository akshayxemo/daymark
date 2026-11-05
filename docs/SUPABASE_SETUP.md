# Supabase setup

Supabase supplies the hosted PostgreSQL database. Daymark uses **only the database**: authentication is Better Auth, not Supabase Auth, and the Supabase Data API is not used. Nothing here is required for local development, which uses Docker.

## 1. Create the project

1. In the Supabase dashboard choose **New project**.
2. Pick your organisation, a project name (for example `daymark-production`), and a **region close to your Vercel functions** (Vercel's default is Washington, D.C., `iad1`; an `us-east-1` Supabase region is a good match).
3. Generate a strong **database password** and store it in your password manager. You will need it in the connection strings.
4. Wait until the project finishes provisioning.

Create a **second project for previews and staging** (for example `daymark-preview`). Preview deployments must never use the production database.

## 2. Copy the connection strings

Open the project and click **Connect** (top of the dashboard). Under the connection string tab you will see three options. Replace `[YOUR-PASSWORD]` with the database password.

| Supabase option        | Looks like                                                                                     | Use it for                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Transaction pooler** | `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres` | `DATABASE_URL` (application runtime on Vercel)                           |
| **Direct connection**  | `postgresql://postgres:[YOUR-PASSWORD]@db.<ref>.supabase.co:5432/postgres`                     | `DATABASE_URL_UNPOOLED` (migrations, `pg_dump`) if your network has IPv6 |
| **Session pooler**     | `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres` | `DATABASE_URL_UNPOOLED` when your network is IPv4-only                   |

Append `?sslmode=require` to both strings. If the password contains special characters, URL-encode them (for example `@` becomes `%40`).

Why two connections: serverless functions open many short connections, which the transaction pooler (port 6543) absorbs. Transaction pooling does not support prepared statements, so Daymark disables them (`prepare: false`). Migrations run long DDL in one session, so they should use the direct connection or the session pooler.

## 3. Initialise the database from your machine

No SQL editor is needed. From a checkout of the repository:

```bash
pnpm install
# Point the migration scripts at Supabase for this shell only.
export DATABASE_URL="<transaction pooler string>?sslmode=require"
export DATABASE_URL_UNPOOLED="<direct or session pooler string>?sslmode=require"
pnpm db:migrate
pnpm db:status
```

PowerShell uses `$env:DATABASE_URL = "..."` instead of `export`. You can also put both values in `.env.local` temporarily, but remember that `.env.local` is then pointing at Supabase.

`pnpm db:migrate` creates every table, constraint and index, and applies the Data API lockdown. `pnpm db:status` must report `Schema is up to date.` Do **not** run `pnpm db:seed --demo` against production.

## 4. Verify

- Supabase → **Table Editor** shows tables such as `tasks`, `workspaces` and `user`, each marked as RLS enabled.
- Supabase → **Database → Migrations** is not used by Daymark; its own record lives in the `drizzle.__drizzle_migrations` table.
- After deploying, `https://<your-domain>/api/health` returns `{"status":"ok","database":"ok"}`.

## Security model

- The application connects as the `postgres` role, which owns the tables. Every query is scoped to the signed-in user by the application, and composite foreign keys make cross-account references impossible at the database level.
- Supabase automatically exposes the `public` schema through its REST and GraphQL Data API using the `anon` and `authenticated` roles, whose keys are designed to be public. Migration `0001_lock_down_data_api.sql` enables row-level security on every table **with no policies** and revokes those roles' grants. Non-owner roles therefore cannot read or write anything, while the owner connection used by Daymark is unaffected.
- This is deliberately not a per-user RLS scheme. Better Auth sessions are not Supabase JWTs, and pooled connections do not carry a trustworthy per-request user context, so per-user policies would look secure without enforcing anything. User isolation is enforced by the application and the foreign keys instead.
- Optional extra hardening: Project Settings → **Data API** → remove `public` from the exposed schemas, or turn the Data API off.
- Never put the database password, `service_role` key or connection strings in client code or commits. Daymark does not need the Supabase API keys at all.

## Backups

Supabase takes automatic daily backups on paid plans. Keep your own as well:

```bash
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL_UNPOOLED" --file daymark-$(date +%F).dump
```

Moving to self-hosted PostgreSQL later is a `pg_dump` from Supabase and a `pg_restore` into the new server; no code changes are needed.
