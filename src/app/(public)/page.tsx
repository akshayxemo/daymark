import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChartBar,
  Check,
  FolderKanban,
  GitBranch,
  NotebookPen,
  Rocket,
  Timer,
} from 'lucide-react';
import { absoluteUrl, repositoryUrl, siteDescription, siteName, siteTagline } from '@/lib/site';

const pageTitle = `${siteName} — ${siteTagline}`;

export const metadata: Metadata = {
  title: { absolute: pageTitle },
  description: siteDescription,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: { url: absoluteUrl('/'), title: pageTitle, description: siteDescription },
};

/* Structured data. Static values only: never include user data here. */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      url: absoluteUrl('/'),
      name: siteName,
      description: siteDescription,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': absoluteUrl('/#software'),
      name: siteName,
      url: absoluteUrl('/'),
      description: siteDescription,
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/license/mit',
      downloadUrl: repositoryUrl,
      softwareHelp: { '@type': 'CreativeWork', url: absoluteUrl('/docs') },
      screenshot: absoluteUrl('/dashboard-preview.jpg'),
    },
  ],
};

const loop = [
  {
    title: 'Plan',
    text: 'Choose what today and this week should hold. Work that slips carries over with its history intact.',
  },
  {
    title: 'Work',
    text: 'Start a timer on the task in front of you. It runs on the server, so it survives closed tabs and dead batteries.',
  },
  {
    title: 'Track',
    text: 'Attach repositories, branches, Jira issues, pull requests and commits to the tasks they belong to.',
  },
  {
    title: 'Deliver',
    text: 'Record merges, deployments and verifications per environment, all the way to production.',
  },
  {
    title: 'Review',
    text: 'Close the day in the journal, then let analytics show the gap between the plan and what happened.',
  },
];

const features = [
  {
    id: 'tasks',
    icon: FolderKanban,
    title: 'Tasks & projects',
    text: 'Projects, task types, priorities and estimates, with statuses and phases you define per workspace.',
  },
  {
    id: 'planning',
    icon: CalendarDays,
    title: 'Daily & weekly planning',
    text: 'Plan the day and the week, move tasks between days and keep the carryover history of everything that slipped.',
  },
  {
    id: 'time',
    icon: Timer,
    title: 'Server-authoritative timer',
    text: 'One running session at a time with pause and resume, timed on the server. Manual entries fill the gaps, with an audit trail.',
  },
  {
    id: 'development',
    icon: GitBranch,
    title: 'Development tracking',
    text: 'Repositories and branches, plus Jira, pull request, commit, issue and documentation references on every task.',
  },
  {
    id: 'deliveries',
    icon: Rocket,
    title: 'Delivery records',
    text: 'Merged, deployed and verified, recorded per environment: development, staging, UAT and production.',
  },
  {
    id: 'activity',
    icon: Activity,
    title: 'Activity timeline',
    text: 'An append-only record of what changed and when, across tasks, plans, time, references and deliveries.',
  },
  {
    id: 'journal',
    icon: NotebookPen,
    title: 'Journal & daily reviews',
    text: 'Daily reviews, weekly goals and typed journal entries, linked to the tasks they are about.',
  },
  {
    id: 'analytics',
    icon: ChartBar,
    title: 'Analytics',
    text: 'Completion, time distribution, estimate versus actual, carryover trend, cycle time and production delivery rate.',
  },
];

const privacyPoints = [
  {
    title: 'Your data lives in your PostgreSQL',
    text: 'Self-hosted or in your own Supabase project. Daymark reads and writes one database you control, and nowhere else.',
  },
  {
    title: 'No tracking scripts',
    text: 'No third-party analytics, advertising pixels or session recording. The only cookie is the one that keeps you signed in.',
  },
  {
    title: 'Export anytime',
    text: 'Download your records as JSON or CSV from Settings whenever you want them somewhere else.',
  },
  {
    title: 'Delete anytime',
    text: 'Delete your account from Settings. Every record you own is removed with it.',
  },
  {
    title: 'Private by default',
    text: 'Every request is authorised on the server. Your workspaces are visible to you alone.',
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />

      <section className="site-hero" aria-labelledby="hero-title">
        <div className="site-container">
          <div className="site-hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true" />
              Open source · Privacy-first · Self-hostable
            </p>
            <h1 id="hero-title">A clear record of what you planned, worked on and delivered.</h1>
            <p className="lede">
              {siteName} is a personal work and life intelligence dashboard. Record what you
              planned, what you worked on, how much time you invested and what you actually
              delivered, across work, personal life and learning, in a database you own.
            </p>
            <div className="site-actions">
              <Link className="btn btn-primary" href="/register">
                Create your account
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link className="btn btn-outline" href="/docs">
                Read the docs
              </Link>
            </div>
            <ul className="site-facts">
              <li>
                <span className="live-dot" aria-hidden="true" />
                MIT licensed
              </li>
              <li>
                <span className="live-dot" aria-hidden="true" />
                Standard PostgreSQL
              </li>
              <li>
                <span className="live-dot" aria-hidden="true" />
                No tracking scripts
              </li>
              <li>
                <span className="live-dot" aria-hidden="true" />
                Export anytime
              </li>
            </ul>
          </div>

          <figure className="site-preview">
            <div className="site-preview-frame">
              <div className="site-preview-bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <em>app · overview</em>
              </div>
              <div className="site-preview-image">
                <Image
                  src="/dashboard-preview.jpg"
                  alt="The Daymark overview page in the dark theme. A sidebar lists the Office, Personal and Learning workspaces and the main sections. The page shows metric cards for tasks completed, time invested, longest focus and production deliveries verified, a weekly time chart split by workspace, a focus timer, today's planned tasks with workspace, priority and estimate, a time-per-workspace ring and a recent activity list."
                  fill
                  sizes="(max-width: 1168px) 100vw, 1120px"
                  priority
                />
              </div>
            </div>
            <figcaption className="site-preview-caption">
              The overview of the bundled demo workspace. Every name and number shown is fictional
              sample data.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="site-section" aria-labelledby="loop-title">
        <div className="site-container">
          <div className="site-section-head">
            <p className="eyebrow">
              <span aria-hidden="true" />
              How it works
            </p>
            <h2 id="loop-title">One honest loop, every day.</h2>
            <p>
              Most tools stop at the to-do list. {siteName} keeps going: it records the time, the
              code and the deliveries, so the review at the end of the week is based on what
              happened rather than what you remember.
            </p>
          </div>
          <ol className="site-loop">
            {loop.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-section" id="features" aria-labelledby="features-title">
        <div className="site-container">
          <div className="site-section-head">
            <p className="eyebrow">
              <span aria-hidden="true" />
              What {siteName} records
            </p>
            <h2 id="features-title">Everything that happens between a plan and a delivery.</h2>
            <p>
              Eight modules, one account, one database. Each one is described in detail on the
              features page.
            </p>
          </div>
          <ul className="site-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.id} className="card site-feature">
                  <span className="site-feature-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <Link className="site-more" href={`/features#${feature.id}`}>
                    Learn more
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="site-section" aria-labelledby="workspaces-title">
        <div className="site-container site-split">
          <div>
            <p className="eyebrow">
              <span aria-hidden="true" />
              Workspaces
            </p>
            <h2 id="workspaces-title">Office, Personal, Learning. Separate by design.</h2>
            <p>
              Each workspace keeps its own projects, statuses, phases, tasks and time. Nothing
              bleeds across. One dashboard then lets you look at a single workspace or all of them
              at once, so a long day at the office and a chapter read in the evening both count,
              without mixing.
            </p>
            <p>
              Add custom workspaces for anything else you want to keep apart: a side project, a
              course, a client.
            </p>
          </div>
          <div className="card site-ws" aria-label="Example workspaces">
            <div className="site-ws-row office">
              <span className="live-dot" aria-hidden="true" />
              Office
              <small>Professional</small>
            </div>
            <div className="site-ws-row personal">
              <span className="live-dot" aria-hidden="true" />
              Personal
              <small>Life admin, health, home</small>
            </div>
            <div className="site-ws-row learning">
              <span className="live-dot" aria-hidden="true" />
              Learning
              <small>Books, courses, practice</small>
            </div>
            <div className="site-ws-row custom">
              <span className="live-dot" aria-hidden="true" />
              Custom
              <small>Whatever you need</small>
            </div>
            <div className="site-ws-foot">
              <Check size={13} aria-hidden="true" />
              One account. One dashboard. Separate at the data level.
            </div>
          </div>
        </div>
      </section>

      <section className="site-section" id="privacy" aria-labelledby="privacy-title">
        <div className="site-container site-split">
          <div>
            <p className="eyebrow">
              <span aria-hidden="true" />
              Privacy-first
            </p>
            <h2 id="privacy-title">Your days are your business.</h2>
            <p>
              A record of how you spend your time is about as personal as data gets. {siteName} is
              built so that nobody but you needs to see it.
            </p>
            <div className="site-actions">
              <Link className="btn btn-outline" href="/privacy">
                Read the privacy policy
              </Link>
            </div>
          </div>
          <ul className="site-checks">
            {privacyPoints.map((point) => (
              <li key={point.title}>
                <span className="site-check-icon" aria-hidden="true">
                  <Check size={12} />
                </span>
                <div>
                  <strong>{point.title}</strong>
                  <span>{point.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-section" id="self-hosting" aria-labelledby="selfhost-title">
        <div className="site-container site-split">
          <div>
            <p className="eyebrow">
              <span aria-hidden="true" />
              Open source & self-hosting
            </p>
            <h2 id="selfhost-title">Run it on your own machine.</h2>
            <p>
              {siteName} is MIT licensed and ships with a Docker Compose file that runs the
              application next to a standard PostgreSQL database. Schema changes are plain SQL
              migrations managed with Drizzle, applied automatically when the container starts.
            </p>
            <p>
              Nothing phones home. Updating is a <code>git pull</code> and a rebuild.
            </p>
            <div className="site-actions">
              <Link className="btn btn-outline" href="/docs#self-hosting">
                Self-hosting guide
              </Link>
              <a className="btn btn-outline" href={repositoryUrl}>
                View the source
              </a>
            </div>
          </div>
          <pre>
            <code>
              <span className="comment"># Self-hosted with Docker Compose</span>
              {'\n'}git clone {repositoryUrl}.git{'\n'}cd daymark{'\n'}cp .env.example .env
              {'\n'}
              <span className="comment"># set BETTER_AUTH_SECRET, APP_URL and email settings</span>
              {'\n'}docker compose --profile app up -d --build
            </code>
          </pre>
        </div>
      </section>

      <section className="site-section" id="cloud" aria-labelledby="cloud-title">
        <div className="site-container">
          <div className="site-section-head">
            <p className="eyebrow">
              <span aria-hidden="true" />
              Cloud-hosted option
            </p>
            <h2 id="cloud-title">Or deploy the same app to Vercel and Supabase.</h2>
            <p>
              Prefer not to run a server? The same codebase deploys to Vercel with a Supabase
              PostgreSQL database behind it. Same migrations, same features, same export. Your data
              still sits in a database that belongs to your account.
            </p>
          </div>
          <div className="site-actions" style={{ marginTop: 0 }}>
            <Link className="btn btn-outline" href="/docs#vercel">
              Vercel + Supabase guide
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="site-cta" aria-labelledby="cta-title">
        <div className="site-container">
          <div className="site-cta-box">
            <p className="eyebrow">
              <span aria-hidden="true" />
              {siteTagline}
            </p>
            <h2 id="cta-title">Start recording your days.</h2>
            <p>
              Create an account on this instance, or clone the repository and run your own. Either
              way the data is yours.
            </p>
            <div className="site-actions">
              <Link className="btn btn-primary" href="/register">
                Create your account
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link className="btn btn-outline" href="/docs">
                Read the docs
              </Link>
            </div>
            <p className="site-cta-alt">
              Already have an account?{' '}
              <Link className="link" href="/login">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
