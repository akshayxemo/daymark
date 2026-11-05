# Vercel deployment

Prerequisites: the Supabase projects from [SUPABASE_SETUP.md](SUPABASE_SETUP.md) with migrations applied, an email provider (below), and the repository on GitHub.

## 1. Import the project

1. Vercel → **Add New… → Project** → import the GitHub repository.
2. Framework preset: **Next.js** (detected). Root directory: repository root. Install command: `pnpm install` (Vercel reads `packageManager` from `package.json`). Build command: `pnpm build`. Leave the output directory at its default.
3. Do not deploy yet: add the environment variables first.

## 2. Environment variables

Vercel → Project → **Settings → Environment Variables**. Add each value for the environments shown. Mark secrets as **Sensitive**.

| Variable             | Production                                                      | Preview                                                               | Development (only if you use `vercel dev`) |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `APP_URL`            | `https://<your-domain>`                                         | leave unset (falls back to the preview URL) or a fixed staging domain | `http://localhost:3000`                    |
| `DATABASE_URL`       | Production transaction pooler `…:6543/postgres?sslmode=require` | **Preview project's** transaction pooler                              | local Docker URL                           |
| `BETTER_AUTH_SECRET` | new random value                                                | **different** random value                                            | any local value                            |
| `EMAIL_PROVIDER`     | `resend` (or `smtp`)                                            | `resend` or `smtp`                                                    | `console`                                  |
| `EMAIL_FROM`         | `Daymark <no-reply@<your-domain>>`                              | same or a staging sender                                              | —                                          |
| `RESEND_API_KEY`     | production key                                                  | separate key if possible                                              | —                                          |
| `REGISTRATION_MODE`  | `open` for the public beta, or `invite`                         | `invite` or `disabled`                                                | `open`                                     |
| `DEPLOYMENT_MODE`    | `multi-user`                                                    | `multi-user`                                                          | `multi-user`                               |
| `DEFAULT_TIMEZONE`   | e.g. `UTC`                                                      | same                                                                  | same                                       |

`DATABASE_URL_UNPOOLED` is not used at runtime; you only need it where you run migrations. "Automatically expose System Environment Variables" must stay enabled (the default) so previews get `VERCEL_URL`.

Static public pages read `APP_URL` at build time for canonical URLs and the sitemap. After changing `APP_URL`, redeploy.

Preview safety: preview deployments use the preview Supabase project and their own secret, so a preview can never read production sessions or data. Keep preview registration closed or invite-only, since preview URLs are guessable.

## 3. Email provider (Resend)

1. Create a Resend account → **Domains → Add domain** → enter the domain you send from (a subdomain such as `mail.<your-domain>` keeps reputation separate).
2. Add the DNS records Resend shows (SPF/MX and DKIM, optionally DMARC) at your DNS provider and wait for **Verified**.
3. **API Keys → Create API key** with _Sending access_, optionally restricted to that domain. Copy it into `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on the verified domain.

Any SMTP provider works instead: set `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT` (587 with STARTTLS or 465 with `SMTP_SECURE=true`), `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.

## 4. Deploy

1. Confirm `pnpm db:status` against the production database says up to date.
2. Vercel → **Deploy** (or push to the production branch).
3. Add your domain: Project → **Settings → Domains**, then update `APP_URL` to match and redeploy.

### Migrations on later releases

Run migrations from a trusted machine before promoting a release that contains new files in `drizzle/`:

```bash
DATABASE_URL_UNPOOLED="<production direct connection>" pnpm db:migrate
```

Migrations are additive by convention, so the running version keeps working while they apply. Running migrations inside the Vercel build is possible (`pnpm db:migrate && pnpm build`) but not recommended: every preview build would migrate whatever database it points at.

## 5. Verify after deployment

1. `https://<your-domain>/api/health` → `{"status":"ok","database":"ok"}`.
2. `https://<your-domain>/robots.txt` disallows `/app` and `/api/`; `/sitemap.xml` lists only public pages with your domain.
3. Register at `/register`. The first account becomes the owner. The verification email must arrive (check spam and the Resend dashboard's **Logs**).
4. Open the link → onboarding → dashboard. Sign out, request a password reset, and complete it.
5. In a private window, request `https://<your-domain>/app` → redirected to `/login`; `https://<your-domain>/api/v1/tasks` → `401`.
6. Vercel → **Logs**: no `Invalid environment configuration` errors.

## 6. First public registration

- For an open beta keep `REGISTRATION_MODE=open`. Sign-up is rate-limited (5 per minute per IP) and requires email verification.
- For a controlled beta set `REGISTRATION_MODE=invite`, redeploy, then create invitation links in **Settings → Account → Invitations** as the owner.

Troubleshooting:

| Symptom                                                            | Cause                                                                                                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 500 on every request, log says `Invalid environment configuration` | A required variable is missing in that Vercel environment. The message lists which.                                                                                          |
| `prepared statement … does not exist`                              | `DATABASE_URL` points at the transaction pooler through a client with prepared statements. Daymark disables them; check you are not overriding the URL with another library. |
| Sign-in works but you are immediately signed out                   | `APP_URL` does not match the domain you are using, so cookies or the origin check fail.                                                                                      |
| Verification email never arrives                                   | Sender domain not verified, or `EMAIL_FROM` not on it. Check provider logs.                                                                                                  |
