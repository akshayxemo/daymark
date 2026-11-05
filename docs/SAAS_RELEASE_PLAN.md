# Daymark SaaS release plan

Status: foundation only. The existing dashboard is still a browser-local demonstration and must not be published as a multi-user product.

## Decisions

- Use PostgreSQL, Drizzle, and versioned SQL migrations. Supabase supplies hosted PostgreSQL initially; self-hosted PostgreSQL uses the same data model. Configure application and migration connections independently to support Supabase transaction pooling and direct migration connections.
- Use Better Auth with database-backed accounts and sessions. Email verification, password reset, secure session handling, rate limits, and mail delivery must be completed and tested before opening registration.
- Keep Personal and Office as individual, private workspaces. Authenticate every protected request and scope every query by server-verified user identity. Database constraints additionally prevent associating tasks with another user's workspace or project.
- Publisher reporting should be separate from personal task data. Design around disclosed, minimal usage metadata and aggregate counts; do not expose task titles, journals, or session descriptions to the publisher. Decide retention and disclosure before activating tracking.
- Existing local demo data must be explicitly imported by the signed-in owner, validated, previewed, and committed transactionally without removing the local copy.

## Implemented foundation

- PostgreSQL driver and Drizzle configuration with separate application and migration connection strings.
- Initial auth table shapes and workspace, project and task tables with cross-owner foreign key constraints.
- Generated initial SQL migration. It has not been applied to any database.
- Prepared an unmounted Better Auth configuration requiring email verification and an injected mail delivery function. It is not yet an authentication flow and does not protect the dashboard.
- Publisher reporting requirement: aggregate usage only, without access to private user records.

## Required before publishing

1. Set up a Supabase project and an email provider; choose an application host and domain.
2. Complete auth, registration, verification, password recovery, account deletion, and access controls.
3. Implement account-scoped project, task, planning, timer, activity and journal APIs; replace browser-local demo state with durable records.
4. Implement app event/history and configurable task statuses and phases transactionally; test isolation, races, timer accuracy, and database migration/restore.
5. Implement the landing page, onboarding, user-facing privacy disclosures, and protected publisher metrics.
6. Set up production secrets, HTTPS, backups, observability, rate limiting, and security and end-to-end testing before enabling public sign-up.
7. Add the PWA and offline sync as a separate milestone; offline conflicts and multi-device timer reconciliation need explicit behavior and tests.

The preliminary schema is a starting point, not a finished domain design. Do not apply this initial migration to production until the schema and auth flows have been integration-tested together. Never commit real credentials or service keys.
