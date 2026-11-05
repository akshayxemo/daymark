import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { absoluteUrl, siteName } from '@/lib/site';

const title = 'Features';
const description =
  'Tasks and projects, daily and weekly planning, a server-authoritative timer, development references, delivery records, an activity timeline, a journal and analytics: everything Daymark records, module by module.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/features') },
  openGraph: { url: absoluteUrl('/features'), title: `${title} · ${siteName}`, description },
};

type Module = {
  id: string;
  eyebrow: string;
  title: string;
  intro: string[];
  points: { label: string; text: string }[];
  tags?: string[];
};

const modules: Module[] = [
  {
    id: 'tasks',
    eyebrow: 'Tasks & projects',
    title: 'Work, organised the way you think about it.',
    intro: [
      'Every task belongs to a workspace and, optionally, to a project. Statuses, phases and task types are defined per workspace, so an Office board can speak the language of a software team while a Learning board stays simple.',
      'Tasks get a stable number (DM-42), a priority, an estimate in minutes, a planned date and a due date. Dependencies, tags and duplicates are supported.',
    ],
    points: [
      {
        label: 'Configurable statuses',
        text: 'Each status has a category (not started, active, paused, waiting, done or closed) plus flags: initial, terminal, counts as completed, stops the timer.',
      },
      {
        label: 'Phases',
        text: 'Optional phases such as design, implementation or code review describe where a task is, independently of its status.',
      },
      {
        label: 'Projects you can archive',
        text: 'Archive a finished project and restore it later. Its tasks, time and history are kept.',
      },
    ],
    tags: ['not_started', 'active', 'paused', 'waiting', 'done', 'closed'],
  },
  {
    id: 'planning',
    eyebrow: 'Daily & weekly planning',
    title: 'Plan the day, plan the week, keep the receipts.',
    intro: [
      'The planner answers two questions: what did I intend to do today, and what did I intend to do this week. Tasks are placed on days; moving one to another day records the previous and new dates.',
      'Unfinished work can be carried over to the next day in one step. Every carryover is recorded with its reason, so the week view can show how often a task slipped before it was finished.',
    ],
    points: [
      {
        label: 'Plan history',
        text: 'Each placement is stored with a reason: initial, moved, carryover or unplanned. Nothing is overwritten.',
      },
      {
        label: 'Weekly goals',
        text: 'A short list of intentions for the week, each planned, in progress, completed or dropped.',
      },
      {
        label: 'Attention lists',
        text: 'Overdue, blocked and carryover candidates are surfaced on the overview so they do not hide in the backlog.',
      },
    ],
    tags: ['initial', 'moved', 'carryover', 'unplanned'],
  },
  {
    id: 'time',
    eyebrow: 'Server-authoritative timer',
    title: 'Time that is measured, not guessed.',
    intro: [
      'The timer lives on the server. Starting, pausing, resuming and stopping are recorded as intervals with server timestamps, so a closed laptop, a lost tab or a second device cannot corrupt the total.',
      'One session can run or be paused at a time, across all your workspaces. Starting a timer on another task closes the previous session cleanly; a status marked as stops the timer does the same.',
    ],
    points: [
      {
        label: 'Pause and resume',
        text: 'Paused time is simply not counted. Sessions keep their full list of intervals for later inspection.',
      },
      {
        label: 'Manual entries',
        text: 'Forgot to start the timer? Add a manual entry with a start, an end and a note. Edits and deletions are written to an audit table.',
      },
      {
        label: 'Reports in your timezone',
        text: 'Daily totals are calculated in the timezone you set in Settings, not the server’s.',
      },
    ],
    tags: ['running', 'paused', 'completed', 'cancelled'],
  },
  {
    id: 'development',
    eyebrow: 'Development tracking',
    title: 'Keep the code and the task in the same place.',
    intro: [
      'For software work, a task is rarely just a title. Daymark lets you register repositories (GitHub, GitLab, Bitbucket, Azure DevOps or anything else), attach a branch and its working status to a task, and add references to the artefacts around it.',
      'There are no integrations to authorise and no tokens to store. References are links and identifiers you enter, which keeps the module useful for private repositories and internal tooling.',
    ],
    points: [
      {
        label: 'Repositories and branches',
        text: 'Branch work moves through planned, in progress, in review, merged or abandoned.',
      },
      {
        label: 'References',
        text: 'Jira issues, pull requests, commits, issues, documentation pages and other links, each with a label and a URL.',
      },
      {
        label: 'Per workspace',
        text: 'Repositories belong to a workspace, so client and personal code never share a list.',
      },
    ],
    tags: ['jira', 'pull_request', 'commit', 'issue', 'documentation'],
  },
  {
    id: 'deliveries',
    eyebrow: 'Delivery records',
    title: 'Done is not the same as delivered.',
    intro: [
      'A delivery record states that something happened to a task in a specific environment: it was merged, it was deployed, or it was verified. Each record carries an environment, a status and a timestamp, with room for a note or a link.',
      'The distinction matters for analytics. A task can be complete on the board for weeks before it reaches production; the delivery rate is based on records, not statuses.',
    ],
    points: [
      {
        label: 'Three delivery types',
        text: 'Merged, deployed and verified, recorded separately so a failed verification is visible.',
      },
      {
        label: 'Environments',
        text: 'Development, staging, UAT, production or other. Production is what the overview counts.',
      },
      {
        label: 'Status',
        text: 'Pending, successful or failed. Failed deliveries stay in the record.',
      },
    ],
    tags: ['development', 'staging', 'uat', 'production'],
  },
  {
    id: 'activity',
    eyebrow: 'Activity timeline',
    title: 'What changed, when, in order.',
    intro: [
      'Every meaningful change writes an activity entry: a task created, a status or phase changed, a plan moved, a timer started or stopped, a reference attached, a delivery recorded. The timeline is append-only while your account exists.',
      'It is the layer that makes the rest trustworthy. If a number in analytics looks wrong, the activity for that task explains how it got there.',
    ],
    points: [
      {
        label: 'Typed entries',
        text: 'Every entry has an event type, the entity it concerns, a summary and a timestamp.',
      },
      {
        label: 'Before and after',
        text: 'Edits to time records also keep a before-and-after snapshot in an audit table.',
      },
      {
        label: 'Kept as long as your account',
        text: 'History entries are never edited or removed. They leave only when you delete your account.',
      },
    ],
  },
  {
    id: 'journal',
    eyebrow: 'Journal & daily reviews',
    title: 'A few lines at the end of the day.',
    intro: [
      'The journal is for the part a task list cannot hold: what went well, what got in the way, what you learned. Entries have a type, free text, tags and optional links to the tasks they are about.',
      'A daily review is a lightweight, structured entry for closing the day. Over time it becomes the narrative behind the numbers.',
    ],
    points: [
      {
        label: 'Entry types',
        text: 'Daily review, technical, personal, meeting, learning, achievement, blocker or general.',
      },
      {
        label: 'Linked to tasks',
        text: 'Attach the tasks an entry refers to, so a blocker shows up next to the work it blocked.',
      },
      {
        label: 'Account-wide',
        text: 'The journal is yours across workspaces; entries can still be tagged to keep themes apart.',
      },
    ],
    tags: ['daily_review', 'technical', 'meeting', 'learning', 'achievement', 'blocker'],
  },
  {
    id: 'analytics',
    eyebrow: 'Analytics',
    title: 'The gap between the plan and the week.',
    intro: [
      'Analytics are computed from the records above, for a date range and optionally a single workspace. They are descriptive, not gamified: no streaks, no scores, no nudges.',
      'The overview shows the essentials for today and this week. The report view goes deeper.',
    ],
    points: [
      {
        label: 'Completion and time distribution',
        text: 'Planned versus completed tasks, and tracked time split by workspace and project.',
      },
      {
        label: 'Estimate versus actual',
        text: 'For tasks with an estimate, the ratio of tracked minutes to estimated minutes, per task and in total.',
      },
      {
        label: 'Carryover trend and cycle time',
        text: 'How much planned work slipped each week, and how long tasks take in calendar hours versus active hours.',
      },
      {
        label: 'Production delivery rate',
        text: 'Successful deliveries by environment, and the share of completed tasks that reached production.',
      },
    ],
  },
  {
    id: 'workspaces',
    eyebrow: 'Workspaces',
    title: 'Separate at the data level, together on one dashboard.',
    intro: [
      'A workspace is a hard boundary. Projects, statuses, phases, task types, tags, repositories and time all belong to exactly one workspace, and the API checks ownership on every request.',
      'The dashboard can be scoped to one workspace or to all of them, which is how a single person can keep professional, personal and learning work apart without keeping three accounts.',
    ],
    points: [
      {
        label: 'Office, Personal, Learning',
        text: 'Office, Personal and Learning are offered during onboarding, each with default statuses, phases and task types. Skip or rename any of them.',
      },
      {
        label: 'Custom workspaces',
        text: 'Add as many as you need for clients, side projects or courses.',
      },
      {
        label: 'Per-workspace settings',
        text: 'Statuses, phases and task types are configured per workspace, not globally.',
      },
    ],
  },
  {
    id: 'data',
    eyebrow: 'Your data',
    title: 'Export it, delete it, host it yourself.',
    intro: [
      'Daymark stores everything in a PostgreSQL database that you or the operator of your instance control. There is no separate analytics pipeline, no third-party tracker and no data sent to anyone else.',
      'From Settings you can export your records as JSON or CSV at any time, and you can delete your account, which removes every record you own after an email confirmation.',
    ],
    points: [
      {
        label: 'Self-host with Docker Compose',
        text: 'One command runs the app and a PostgreSQL container; migrations apply on start.',
      },
      {
        label: 'Or Vercel + Supabase',
        text: 'The same application with a managed database. Nothing is forked for the cloud.',
      },
      {
        label: 'MIT licensed',
        text: 'Read the source, change it, run it anywhere.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <header className="site-page-head">
        <div className="site-container">
          <p className="eyebrow">
            <span aria-hidden="true" />
            Features
          </p>
          <h1>What {siteName} records, module by module.</h1>
          <p className="lede">
            Each module is small on its own. Together they turn a to-do list into a record of what
            you planned, what you worked on, how long it took and what you shipped.
          </p>
          <nav aria-label="On this page">
            <ul className="site-anchor-nav">
              {modules.map((module) => (
                <li key={module.id}>
                  <a href={`#${module.id}`}>{module.eyebrow}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {modules.map((module) => (
        <section
          key={module.id}
          id={module.id}
          className="site-module"
          aria-labelledby={`${module.id}-title`}
        >
          <div className="site-container site-module-grid">
            <div className="site-module-copy">
              <p className="eyebrow">
                <span aria-hidden="true" />
                {module.eyebrow}
              </p>
              <h2 id={`${module.id}-title`}>{module.title}</h2>
              {module.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {module.tags ? (
                <div className="site-tags" aria-label="Values used by this module">
                  {module.tags.map((tag) => (
                    <span key={tag} className="site-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <ul className="site-module-list">
              {module.points.map((point) => (
                <li key={point.label}>
                  <strong>{point.label}.</strong> <span>{point.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="site-cta" aria-labelledby="features-cta-title">
        <div className="site-container">
          <div className="site-cta-box">
            <h2 id="features-cta-title">Try it on your own work.</h2>
            <p>
              Create an account on this instance, or read the documentation to run {siteName} on
              your own machine in a few minutes.
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
          </div>
        </div>
      </section>
    </>
  );
}
