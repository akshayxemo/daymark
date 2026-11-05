# Security Policy

Daymark stores personal work and life data, so we take reports about its security seriously. Thank you for helping keep users safe.

## Supported versions

Security fixes are applied to the `main` branch and included in the latest release. Older releases do not receive backported fixes; self-hosted installations should track the latest release.

| Version                 | Supported |
| ----------------------- | --------- |
| `main` / latest release | Yes       |
| Earlier releases        | No        |

## Reporting a vulnerability

**Please do not open a public issue, pull request or discussion for a security problem.**

Report it privately through GitHub Security Advisories: open the repository's **Security** tab and choose **Report a vulnerability** (https://github.com/akshayxemo/daymark/security/advisories/new). The report is visible only to the maintainers until a fix is published.

Include as much of the following as you can:

- The affected area (for example authentication, the REST API under `/api/v1`, data export, email delivery).
- Steps to reproduce or a proof of concept.
- The impact you believe it has (data exposure, privilege escalation, denial of service, and so on).
- The version or commit you tested against and how Daymark was deployed.

## What to expect

- We aim to acknowledge a report within **7 days**.
- We will keep you informed while we investigate, work on a fix and plan a release. This is a volunteer-maintained project, so timelines are best effort.
- Once a fix is available we publish a release and a security advisory. We are happy to credit you in the advisory unless you prefer to stay anonymous.
- Please give us reasonable time to address the problem before disclosing it publicly.

## Scope

In scope: the application code in this repository, including authentication and session handling, authorization between users, the REST API, data import and export, the database schema and migrations, and the provided Docker and CI configuration.

Out of scope: the security of a particular deployment. The operator of a Daymark instance is responsible for their hosting environment, TLS configuration, secrets, PostgreSQL server, email provider and backups. Vulnerabilities in third-party dependencies should be reported upstream; tell us as well if Daymark is affected by one.

## Hardening a self-hosted instance

- Serve Daymark over **HTTPS** only and set `APP_URL` to the public origin; cookies and auth callbacks depend on it.
- Use a strong, unique **`BETTER_AUTH_SECRET`** of at least 32 random characters (`openssl rand -base64 32`). Rotating it signs out every session.
- Keep **PostgreSQL private**. The bundled `docker-compose.yml` binds the database to `127.0.0.1` only; do not expose port 5432 to the internet, and use a dedicated database user with a strong password.
- **Rotate credentials** (database password, email provider keys, auth secret) if you suspect they leaked, and never commit `.env` files.
- Keep **email verification enabled** (`REQUIRE_EMAIL_VERIFICATION=true`) with a real provider in production; password reset depends on email delivery.
- For private instances set **`REGISTRATION_MODE=disabled`** once your accounts exist, or **`REGISTRATION_MODE=invite`** to allow only invited users. `DEPLOYMENT_MODE=single-user` closes registration automatically after the first account.
- Delete the demo account created by `pnpm db:seed --demo` before exposing an installation publicly.
- Apply updates promptly and run `pnpm db:migrate` (the Docker image does this on start) so security-relevant schema changes are in place.
- Back up the database regularly and store backups as carefully as the live data.
