# Deployment

The same application and schema run in three ways:

| Target                      | Guide                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Local development           | [README.md](../README.md#local-development)                                             |
| Hosted: Vercel + Supabase   | [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) and [SUPABASE_SETUP.md](SUPABASE_SETUP.md) |
| Self-hosted: Docker Compose | [below](#self-hosting-with-docker-compose)                                              |

No core feature depends on Vercel or Supabase APIs. Moving between targets means moving the PostgreSQL data (`pg_dump`/`pg_restore`, see [DATABASE.md](DATABASE.md#backup-and-restore)) and setting the environment.

## Environment variables

The server validates its environment with Zod on the first request (`src/server/config/env.ts`) and fails with a message listing every problem. `next build` does not need secrets or a database. No variable is exposed to the browser: there are no `NEXT_PUBLIC_*` variables.

| Variable                                                                         | Required                                 | Secret         | Used for                                                                                                                                            | Where to set it                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `APP_URL`                                                                        | Production (optional on Vercel previews) | No             | Public origin without trailing slash. Auth callbacks, email links, trusted origin, canonical URLs, sitemap. Static pages read it **at build time**. | Vercel (per environment), `.env` for Docker, `.env.local` locally            |
| `DATABASE_URL`                                                                   | Yes                                      | Yes            | Runtime PostgreSQL connection. Supabase: transaction pooler (port 6543).                                                                            | Vercel, `.env`, `.env.local`                                                 |
| `DATABASE_URL_UNPOOLED`                                                          | No (recommended for hosted)              | Yes            | Migrations, seed, `pg_dump`. Supabase: direct or session pooler (port 5432). Falls back to `DATABASE_URL`.                                          | Your shell / `.env.local` when running `pnpm db:migrate`; optional in Vercel |
| `BETTER_AUTH_SECRET`                                                             | Yes                                      | Yes            | Signs sessions and tokens. ≥ 32 characters (`openssl rand -base64 32`). Different value per environment.                                            | Vercel, `.env`, `.env.local`                                                 |
| `EMAIL_PROVIDER`                                                                 | Production                               | No             | `resend`, `smtp`, or `console` (logs emails; refused in production). Defaults to `console` outside production.                                      | Vercel, `.env`, `.env.local`                                                 |
| `EMAIL_FROM`                                                                     | With resend/smtp                         | No             | Sender, e.g. `Daymark <no-reply@example.com>`. Must be a verified sender at your provider.                                                          | Same                                                                         |
| `RESEND_API_KEY`                                                                 | With resend                              | Yes            | Resend API key with sending access.                                                                                                                 | Same                                                                         |
| `SMTP_HOST`, `SMTP_PORT`                                                         | With smtp                                | No             | SMTP server.                                                                                                                                        | Same                                                                         |
| `SMTP_USER`, `SMTP_PASSWORD`                                                     | Optional                                 | Yes (password) | SMTP authentication.                                                                                                                                | Same                                                                         |
| `SMTP_SECURE`                                                                    | No                                       | No             | `true` for implicit TLS (port 465); `false` uses STARTTLS when offered.                                                                             | Same                                                                         |
| `REGISTRATION_MODE`                                                              | No                                       | No             | `open` (default), `invite`, `disabled`. The first account can always be created.                                                                    | Same                                                                         |
| `DEPLOYMENT_MODE`                                                                | No                                       | No             | `multi-user` (default) or `single-user` (closes registration after the first account).                                                              | Same                                                                         |
| `REQUIRE_EMAIL_VERIFICATION`                                                     | No                                       | No             | `true` (default). Set `false` only for self-hosting without email; password reset still needs email.                                                | Same                                                                         |
| `DEFAULT_TIMEZONE`                                                               | No                                       | No             | IANA timezone for new accounts (default `UTC`). Users change their own in Settings.                                                                 | Same                                                                         |
| `LOG_LEVEL`                                                                      | No                                       | No             | `debug`, `info` (default), `warn`, `error`.                                                                                                         | Same                                                                         |
| `VERCEL_URL`, `VERCEL_ENV`                                                       | Set by Vercel                            | No             | Fallback origin for previews; smaller connection pool on Vercel.                                                                                    | Automatic                                                                    |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `APP_PORT` | Docker Compose only                      | Password: yes  | Bundled database container and published ports.                                                                                                     | `.env`                                                                       |
| `TEST_DATABASE_URL`                                                              | Tests only                               | No             | Database that integration and e2e tests wipe and rebuild. Never point at real data.                                                                 | `.env.local`, CI                                                             |
| `DEMO_PASSWORD`                                                                  | Seed only                                | Yes            | Password for `pnpm db:seed --demo`.                                                                                                                 | Shell                                                                        |
| `NEXT_OUTPUT`                                                                    | Docker build only                        | No             | `standalone` makes `next build` emit the self-contained server (set in the Dockerfile).                                                             | Dockerfile                                                                   |

`.env.example` lists all of these with comments.

## Self-hosting with Docker Compose

Requirements: Docker with Compose v2. The `web` service builds the image from the repository.

```bash
cp .env.example .env
# Edit .env: set APP_URL, BETTER_AUTH_SECRET, POSTGRES_PASSWORD, and an email provider.
docker compose --profile app up -d --build
```

- The `db` service stores data in the `daymark-postgres` volume and is published on `127.0.0.1` only.
- The `web` container applies pending migrations on start, then serves on port 3000 (`APP_PORT`). Compose overrides `DATABASE_URL` to use the internal `db` hostname, built from the `POSTGRES_*` values.
- Health: `GET /api/health` reports database connectivity; both services have health checks.
- Put a reverse proxy with HTTPS (Caddy, nginx, Traefik) in front for remote access, and set `APP_URL` to the `https://` origin so cookies are marked `Secure`.
- No email provider? Set `REQUIRE_EMAIL_VERIFICATION=false` for a private instance. Password reset will not work without email. For testing, `docker compose --profile mail up -d mailpit` starts a local SMTP catcher (inbox at `http://127.0.0.1:8025`); point `SMTP_HOST` at it. Do not use Mailpit for real users.
- Single-user installs: `DEPLOYMENT_MODE=single-user`. Register once; registration then closes.

Upgrading: `git pull`, then `docker compose --profile app up -d --build`. Back up first (`docker compose exec -T db pg_dump …`, see [DATABASE.md](DATABASE.md#backup-and-restore)).

## Production checklist (all targets)

- `APP_URL` is the real `https://` origin; `BETTER_AUTH_SECRET` is unique to the environment.
- An email provider is configured and a test email arrives (register a throwaway account).
- `pnpm db:status` reports no pending migrations against the production database.
- Registration mode chosen deliberately (`invite` or `disabled` for private instances).
- Backups scheduled and one restore tested.
- `/api/health` monitored.
