# Supabase setup for Daymark

This prepares a database for development. The SaaS application and migration are not yet ready for production users; do not run the initial migration against production data.

1. Create a new Supabase project in your own account. Choose the region and database password in the Supabase dashboard.
2. In the project dashboard, use **Connect** to find its PostgreSQL connection strings. For a serverless app use the transaction pooler for `DATABASE_URL`; use a direct connection for `DATABASE_MIGRATION_URL` when available, or consult Supabase's connection guide for your network.
3. Copy `.env.example` to `.env.local`, then fill in the connection strings locally. Keep credentials private and never paste passwords or connection strings into chat or commit them to Git.
4. Generate a long random value for `BETTER_AUTH_SECRET` and set `BETTER_AUTH_URL` to the app's actual origin. A production email delivery provider and verified sender will also be needed for verification and password recovery.
5. Wait until the database schema, authentication, and migration have been tested together before applying migrations. Creating the Supabase project alone does not connect the current browser demo or import its data.

Switching to self-hosted PostgreSQL later uses standard PostgreSQL connections, schema migrations and a verified backup/restore of the data. It is not merely a URL change when existing data must be moved.
