import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { absoluteUrl, repositoryUrl, siteName } from '@/lib/site';
import { PublicAuthLink } from '../auth-actions';

const title = 'Documentation';
const description =
  'Quick start, self-hosting with Docker Compose, environment variables, database commands, deploying to Vercel and Supabase, backup and restore, and registration modes for Daymark.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/docs') },
  openGraph: { url: absoluteUrl('/docs'), title: `${title} · ${siteName}`, description },
};

const docsFolder = `${repositoryUrl}/tree/main/docs`;
const docLink = (file: string) => `${repositoryUrl}/blob/main/docs/${file}`;

const sections = [
  { id: 'quick-start', label: 'Quick start' },
  { id: 'self-hosting', label: 'Self-hosting with Docker Compose' },
  { id: 'environment', label: 'Environment variables' },
  { id: 'database', label: 'Database commands' },
  { id: 'vercel', label: 'Deploying to Vercel + Supabase' },
  { id: 'backup', label: 'Backup & restore' },
  { id: 'registration', label: 'Registration modes' },
  { id: 'more', label: 'More on GitHub' },
];

const environmentVariables: { name: string; required: string; text: string }[] = [
  {
    name: 'APP_URL',
    required: 'Production',
    text: 'Public origin of the deployment without a trailing slash, e.g. https://daymark.example.com. Used for auth callbacks, emails, canonical URLs and the sitemap. On Vercel previews VERCEL_URL is used when it is omitted.',
  },
  {
    name: 'DATABASE_URL',
    required: 'Yes',
    text: 'PostgreSQL connection string used at runtime. On Supabase, the transaction pooler string (port 6543).',
  },
  {
    name: 'DATABASE_URL_UNPOOLED',
    required: 'Recommended',
    text: 'Direct (unpooled) connection used by migrations. Optional locally; on Supabase, the direct connection (port 5432).',
  },
  {
    name: 'BETTER_AUTH_SECRET',
    required: 'Yes',
    text: 'Secret used to sign sessions and tokens. At least 32 characters. Generate one with openssl rand -base64 32.',
  },
  {
    name: 'EMAIL_PROVIDER',
    required: 'Production',
    text: 'resend, smtp or console. console prints emails to the server log and is refused in production.',
  },
  {
    name: 'EMAIL_FROM',
    required: 'With resend/smtp',
    text: 'Sender shown to recipients, e.g. "Daymark <no-reply@example.com>".',
  },
  { name: 'RESEND_API_KEY', required: 'With resend', text: 'API key for the Resend provider.' },
  {
    name: 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE',
    required: 'With smtp',
    text: 'SMTP server settings. SMTP_SECURE=true for implicit TLS (usually port 465).',
  },
  {
    name: 'REGISTRATION_MODE',
    required: 'No',
    text: 'open (default), invite or disabled. The very first account can always be created.',
  },
  {
    name: 'DEPLOYMENT_MODE',
    required: 'No',
    text: 'multi-user (default) or single-user. In single-user mode registration closes after the first account.',
  },
  {
    name: 'DEFAULT_TIMEZONE',
    required: 'No',
    text: 'IANA timezone applied to new accounts until they choose their own. Defaults to UTC.',
  },
  {
    name: 'REQUIRE_EMAIL_VERIFICATION',
    required: 'No',
    text: 'Defaults to true. Set to false only on self-hosted installations without an email provider; password reset still needs email.',
  },
  {
    name: 'LOG_LEVEL',
    required: 'No',
    text: 'debug, info (default), warn or error.',
  },
];

const databaseCommands: { command: string; text: string }[] = [
  {
    command: 'pnpm db:generate',
    text: 'Generate a new SQL migration in ./drizzle from changes to the Drizzle schema.',
  },
  {
    command: 'pnpm db:migrate',
    text: 'Apply every pending migration. Uses DATABASE_URL_UNPOOLED when set. Safe to run repeatedly.',
  },
  {
    command: 'pnpm db:status',
    text: 'Show which migrations exist on disk and which have been applied to the configured database.',
  },
  {
    command: 'pnpm db:seed',
    text: 'Ensure every workspace has the default statuses, task types and phases. Safe to run repeatedly.',
  },
  {
    command: 'pnpm db:seed --demo',
    text: 'Also create the fictional demo account demo@daymark.local with sample data. Refused when NODE_ENV=production.',
  },
  {
    command: 'pnpm db:reset',
    text: 'Development only. Drops every table and re-applies all migrations. Refuses non-local hosts without --force and never runs in production.',
  },
];

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}>
      {children}
      <ExternalLink size={11} aria-hidden="true" style={{ marginLeft: 4, verticalAlign: -1 }} />
    </a>
  );
}

export default function DocsPage() {
  return (
    <>
      <header className="site-page-head">
        <div className="site-container">
          <p className="eyebrow">
            <span aria-hidden="true" />
            Documentation
          </p>
          <h1>Run {siteName} locally, on your server or in the cloud.</h1>
          <p className="lede">
            Everything on this page applies to the open-source application. Deeper guides live in
            the <External href={docsFolder}>docs folder on GitHub</External>.
          </p>
        </div>
      </header>

      <div className="site-container site-docs">
        <nav className="site-toc" aria-label="Documentation sections">
          <h2>On this page</h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ol>
          <div className="site-toc-external">
            <a href={docsFolder}>
              GitHub docs folder
              <ExternalLink size={11} aria-hidden="true" style={{ marginLeft: 6 }} />
            </a>
          </div>
        </nav>

        <div className="site-prose">
          <section id="quick-start" aria-labelledby="quick-start-title">
            <h2 id="quick-start-title">Quick start</h2>
            <p>
              You need Node.js 20.9 or newer, pnpm 10 and Docker (for the local database). pnpm 10
              comes with Corepack: run <code>corepack enable</code> once, or use{' '}
              <code>npx pnpm@10</code> in place of <code>pnpm</code>.
            </p>
            <pre>
              <code>
                git clone {repositoryUrl}.git{'\n'}cd daymark{'\n'}cp .env.example .env.local
                {'\n'}
                <span className="comment">
                  # edit .env.local: set BETTER_AUTH_SECRET (openssl rand -base64 32)
                </span>
                {'\n'}docker compose up -d db{'\n'}corepack enable{'\n'}pnpm install{'\n'}pnpm
                db:migrate{'\n'}pnpm db:seed --demo{' '}
                <span className="comment"># optional: fictional demo account</span>
                {'\n'}pnpm dev
              </code>
            </pre>
            <p>
              Open <a href="http://localhost:3000">http://localhost:3000</a>. With{' '}
              <code>EMAIL_PROVIDER=console</code> (the default outside production) verification and
              password-reset emails are printed to the terminal running <code>pnpm dev</code>.
            </p>
            <p>
              <code>pnpm db:seed --demo</code> creates a clearly fictional demo account,{' '}
              <code>demo@daymark.local</code>, with sample workspaces, tasks, time and deliveries.
              Set <code>DEMO_PASSWORD</code> before seeding to choose its password; otherwise the
              default documented in <code>scripts/db/seed.ts</code> is used. Change or delete the
              demo account before exposing an installation publicly.
            </p>
          </section>

          <section id="self-hosting" aria-labelledby="self-hosting-title">
            <h2 id="self-hosting-title">Self-hosting with Docker Compose</h2>
            <p>
              The repository ships a <code>docker-compose.yml</code> with two services: a PostgreSQL
              database and the application image. Copy the environment file, set your secrets and
              start both with the <code>app</code> profile.
            </p>
            <pre>
              <code>
                cp .env.example .env{'\n'}
                <span className="comment">
                  # edit .env: APP_URL, BETTER_AUTH_SECRET, POSTGRES_PASSWORD,
                </span>
                {'\n'}
                <span className="comment"># EMAIL_PROVIDER (resend or smtp) and its settings</span>
                {'\n'}docker compose --profile app up -d --build
              </code>
            </pre>
            <ul>
              <li>
                The container applies pending migrations on start, so a fresh install and every
                later update are one command. You can also run <code>pnpm db:migrate</code> from a
                checkout of the repository against the same database.
              </li>
              <li>
                The database port is bound to the loopback interface only (
                <code>127.0.0.1:5432</code> by default), so PostgreSQL is never exposed publicly.
                The app listens on <code>APP_PORT</code> (default 3000).
              </li>
              <li>
                Put a reverse proxy with TLS in front of the app (Caddy, nginx, Traefik) and set{' '}
                <code>APP_URL</code> to the public https origin. Session cookies are marked secure
                in production.
              </li>
              <li>
                A health endpoint is available at <code>/api/health</code>; Compose uses it for the
                container health check.
              </li>
              <li>
                To update: <code>git pull</code> then{' '}
                <code>docker compose --profile app up -d --build</code>.
              </li>
            </ul>
            <p className="site-note">
              <strong>Email is required in production.</strong> Account verification, password
              reset, email change and account deletion are all confirmed by email, so set{' '}
              <code>EMAIL_PROVIDER</code> to <code>resend</code> or <code>smtp</code> with a valid{' '}
              <code>EMAIL_FROM</code>. The <code>console</code> provider is refused when{' '}
              <code>NODE_ENV=production</code>.
            </p>
          </section>

          <section id="environment" aria-labelledby="environment-title">
            <h2 id="environment-title">Environment variables</h2>
            <p>
              Every variable is declared and validated on startup, so a missing or malformed value
              fails fast with a readable message. The annotated reference is{' '}
              <External href={`${repositoryUrl}/blob/main/.env.example`}>.env.example</External>;
              the full descriptions are in{' '}
              <External href={docLink('DEPLOYMENT.md')}>docs/DEPLOYMENT.md</External>.
            </p>
            <div className="site-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Variable</th>
                    <th scope="col">Required</th>
                    <th scope="col">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {environmentVariables.map((variable) => (
                    <tr key={variable.name}>
                      <td>
                        {variable.name.split(', ').map((name, index) => (
                          <span key={name}>
                            {index > 0 ? <br /> : null}
                            <code>{name}</code>
                          </span>
                        ))}
                      </td>
                      <td>{variable.required}</td>
                      <td>{variable.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Docker Compose additionally reads <code>POSTGRES_USER</code>,{' '}
              <code>POSTGRES_PASSWORD</code>, <code>POSTGRES_DB</code>, <code>POSTGRES_PORT</code>{' '}
              and <code>APP_PORT</code> for the bundled containers.
            </p>
          </section>

          <section id="database" aria-labelledby="database-title">
            <h2 id="database-title">Database commands</h2>
            <p>
              Schema changes are plain SQL migrations in <code>./drizzle</code>, generated and
              applied with Drizzle. The scripts read <code>.env.local</code> (or <code>.env</code>)
              and use <code>DATABASE_URL_UNPOOLED</code> when it is set.
            </p>
            <div className="site-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Command</th>
                    <th scope="col">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {databaseCommands.map((entry) => (
                    <tr key={entry.command}>
                      <td>
                        <code>{entry.command}</code>
                      </td>
                      <td>{entry.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="vercel" aria-labelledby="vercel-title">
            <h2 id="vercel-title">Deploying to Vercel + Supabase</h2>
            <p>
              The same application runs as a hosted deployment on Vercel with a Supabase PostgreSQL
              database. In outline:
            </p>
            <ol>
              <li>
                Create a Supabase project and note its database password. Under{' '}
                <strong>Connect</strong>, copy the <strong>transaction pooler</strong> string (port
                6543) for <code>DATABASE_URL</code> and the <strong>direct connection</strong>{' '}
                string (port 5432) for <code>DATABASE_URL_UNPOOLED</code>.
              </li>
              <li>
                Import the repository into Vercel and set the environment variables:{' '}
                <code>APP_URL</code>, <code>DATABASE_URL</code>, <code>DATABASE_URL_UNPOOLED</code>,{' '}
                <code>BETTER_AUTH_SECRET</code>, <code>EMAIL_PROVIDER</code>,{' '}
                <code>EMAIL_FROM</code>, <code>RESEND_API_KEY</code> (or the SMTP settings) and, if
                you want them, <code>REGISTRATION_MODE</code> and <code>DEPLOYMENT_MODE</code>.
              </li>
              <li>
                Apply the schema from your machine: with the Supabase strings in{' '}
                <code>.env.local</code>, run <code>pnpm db:migrate</code>. Migrations use the direct
                connection.
              </li>
              <li>
                Deploy. Open the deployment and register the first account; the first account can
                always be created, whatever <code>REGISTRATION_MODE</code> says.
              </li>
            </ol>
            <p>
              Step-by-step guides:{' '}
              <External href={docLink('VERCEL_DEPLOYMENT.md')}>docs/VERCEL_DEPLOYMENT.md</External>{' '}
              and <External href={docLink('SUPABASE_SETUP.md')}>docs/SUPABASE_SETUP.md</External>.
            </p>
          </section>

          <section id="backup" aria-labelledby="backup-title">
            <h2 id="backup-title">Backup &amp; restore</h2>
            <p>
              {siteName} uses a standard PostgreSQL database, so standard tools apply. Take backups
              with <code>pg_dump</code> and restore them with <code>pg_restore</code>:
            </p>
            <pre>
              <code>
                <span className="comment">
                  # backup (custom format, restorable with pg_restore)
                </span>
                {'\n'}pg_dump --format=custom --no-owner &quot;$DATABASE_URL&quot; &gt;
                daymark-$(date +%F).dump{'\n'}
                {'\n'}
                <span className="comment"># restore into an empty database</span>
                {'\n'}pg_restore --clean --if-exists --no-owner -d &quot;$DATABASE_URL&quot;
                daymark-2026-11-05.dump{'\n'}
                {'\n'}
                <span className="comment">
                  # with Docker Compose, run pg_dump inside the db container
                </span>
                {'\n'}docker compose exec db pg_dump -U daymark -Fc daymark &gt; daymark.dump
              </code>
            </pre>
            <ul>
              <li>
                Supabase projects also keep their own scheduled backups; check the plan you are on.
              </li>
              <li>
                Each user can export their own records as JSON or CSV from <strong>Settings</strong>
                . That export is for portability and personal archives.{' '}
                <strong>A JSON export is not a full database backup</strong>: it does not contain
                other accounts, sessions or verification tokens, and it is not meant to be restored
                over a live database.
              </li>
            </ul>
          </section>

          <section id="registration" aria-labelledby="registration-title">
            <h2 id="registration-title">Registration modes</h2>
            <p>
              Two variables decide who can create an account on an instance. In every mode the very
              first account can be created, so a fresh installation can be set up.
            </p>
            <ul>
              <li>
                <code>REGISTRATION_MODE=open</code> (default): anyone who can reach the instance can
                register.
              </li>
              <li>
                <code>REGISTRATION_MODE=invite</code>: registration requires an invitation code.
                Owners create and revoke codes from <strong>Settings → Account</strong>; a code can
                be tied to an email address and expires.
              </li>
              <li>
                <code>REGISTRATION_MODE=disabled</code>: no new accounts.
              </li>
              <li>
                <code>DEPLOYMENT_MODE=single-user</code>: registration closes automatically after
                the first account, regardless of <code>REGISTRATION_MODE</code>. Use it for a
                personal server. <code>multi-user</code> (default) keeps independent, private
                accounts side by side.
              </li>
            </ul>
            <p>
              <code>REQUIRE_EMAIL_VERIFICATION</code> defaults to true. Turn it off only on a
              self-hosted installation without an email provider; password reset still needs email
              delivery.
            </p>
          </section>

          <section id="more" aria-labelledby="more-title">
            <h2 id="more-title">More on GitHub</h2>
            <ul>
              <li>
                <External href={docsFolder}>The docs folder</External>: every guide, kept with the
                code.
              </li>
              <li>
                <External href={docLink('DEPLOYMENT.md')}>DEPLOYMENT.md</External>: environment
                variables, reverse proxies, updates.
              </li>
              <li>
                <External href={docLink('VERCEL_DEPLOYMENT.md')}>VERCEL_DEPLOYMENT.md</External> and{' '}
                <External href={docLink('SUPABASE_SETUP.md')}>SUPABASE_SETUP.md</External>: the
                hosted path.
              </li>
              <li>
                <External href={docLink('ARCHITECTURE.md')}>ARCHITECTURE.md</External>: how the
                application is put together.
              </li>
              <li>
                <External href={`${repositoryUrl}/issues`}>Issues</External>: bug reports and
                questions.
              </li>
            </ul>
            <p className="site-prose-meta">
              Next:{' '}
              <PublicAuthLink href="/register">Create an account on this instance</PublicAuthLink>{' '}
              or go back to the <Link href="/features">feature overview</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
