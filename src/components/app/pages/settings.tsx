'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDownToLine, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation } from '@/lib/api/queries';
import { useApp } from '../context';
import { ErrorNote, SectionHead } from '../shared';
import { ImportPanel } from './import-panel';

export function SettingsNav() {
  const pathname = usePathname();
  const items = [
    { href: '/app/settings', label: 'Preferences & data' },
    { href: '/app/settings/workspaces', label: 'Workspaces' },
    { href: '/app/settings/account', label: 'Account' },
  ];
  return (
    <nav className="settings-nav" aria-label="Settings sections">
      {items.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? 'outline' : 'ghost'}
          size="sm"
        >
          <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

const zones = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
];

export function SettingsPage() {
  const app = useApp();
  const s = app.settings;
  const [timezone, setTimezone] = useState(s.timezone);
  const save = useApiMutation(
    (input: Record<string, unknown>) => api.patch('/me/settings', input),
    'settings',
    {
      onSuccess: () => app.toast('Preferences saved'),
    },
  );
  return (
    <div className="page-stack">
      <SettingsNav />
      <section className="card settings-card">
        <SectionHead
          title="Your preferences"
          subtitle="Saved to your account and applied on every device."
        />
        <div className="setting-row">
          <div>
            <h3>Timezone</h3>
            <p>Decides what “today” means for planning and reports.</p>
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ timezone });
            }}
          >
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              list="settings-zones"
              aria-label="Timezone"
              maxLength={64}
            />
            <datalist id="settings-zones">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <Button type="submit" size="sm" variant="outline">
              Save
            </Button>
          </form>
        </div>
        <div className="setting-row">
          <div>
            <h3>Week starts on</h3>
            <p>Used by the weekly planner, goals and reports.</p>
          </div>
          <select
            value={s.weekStartsOn}
            onChange={(e) => save.mutate({ weekStartsOn: Number(e.target.value) })}
            aria-label="Week starts on"
          >
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
              (day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="setting-row">
          <div>
            <h3>Date and time format</h3>
            <p>How dates appear in exports and lists.</p>
          </div>
          <div className="inline-form">
            <select
              value={s.dateFormat}
              onChange={(e) => save.mutate({ dateFormat: e.target.value })}
              aria-label="Date format"
            >
              {['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd MMM yyyy'].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select
              value={s.timeFormat}
              onChange={(e) => save.mutate({ timeFormat: e.target.value })}
              aria-label="Time format"
            >
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </select>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h3>Appearance</h3>
            <p>A comfortable space, day or night.</p>
          </div>
          <select
            value={s.theme}
            onChange={(e) => {
              const theme = e.target.value;
              save.mutate({ theme });
              const resolved =
                theme === 'system'
                  ? window.matchMedia('(prefers-color-scheme: light)').matches
                    ? 'light'
                    : 'dark'
                  : theme;
              document.documentElement.dataset.theme = resolved;
            }}
            aria-label="Theme"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Match system</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <h3>Default workspace</h3>
            <p>Pre-selected when you create a task from the all-workspaces view.</p>
          </div>
          <select
            value={s.defaultWorkspaceId ?? ''}
            onChange={(e) => save.mutate({ defaultWorkspaceId: e.target.value || null })}
            aria-label="Default workspace"
          >
            <option value="">None</option>
            {app.activeWorkspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div>
            <h3>Dashboard widgets</h3>
            <p>Choose what the overview shows.</p>
          </div>
          <div className="pill-list">
            {[
              'Time overview',
              'Today’s tasks',
              'Workspace balance',
              'Recent activity',
              'Weekly goals',
            ].map((name) => {
              const visible = !app.hiddenWidgets.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`pill ${visible ? 'active' : ''}`}
                  aria-pressed={visible}
                  onClick={() => app.toggleWidget(name)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
        <ErrorNote error={save.error} />
      </section>

      <section className="card settings-card">
        <SectionHead title="Your data" subtitle="Everything you record belongs to you." />
        <div className="setting-row">
          <div>
            <h3>Export everything (JSON)</h3>
            <p>
              A schema-versioned archive of your workspaces, configuration, tasks, history, time,
              development records, journal and activity. It can be imported into another Daymark
              account.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/api/v1/export" download>
              <ArrowDownToLine size={15} />
              Export JSON
            </a>
          </Button>
        </div>
        <div className="setting-row">
          <div>
            <h3>Export spreadsheets (CSV)</h3>
            <p>Human-readable tables for reporting.</p>
          </div>
          <div className="inline-form">
            {[
              ['tasks', 'Tasks'],
              ['time', 'Time'],
              ['deliveries', 'Deliveries'],
              ['activity', 'Activity'],
            ].map(([type, label]) => (
              <Button key={type} asChild variant="outline" size="sm">
                <a href={`/api/v1/export/csv?type=${type}`} download>
                  <FileSpreadsheet size={13} />
                  {label}
                </a>
              </Button>
            ))}
          </div>
        </div>
        <ImportPanel />
        <div className="preview-note">
          <ShieldCheck size={20} />
          <div>
            <h3>A JSON export is not a database backup</h3>
            <p>
              Exports contain your account’s records only. Operators should back up the whole
              PostgreSQL database with <code>pg_dump</code>; see the backup section of the
              documentation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
