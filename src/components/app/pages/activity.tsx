'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useActivity, useProjects } from '@/lib/api/queries';
import { useApp } from '../context';
import { ActivityList } from '../cards';
import { ErrorNote, SectionHead } from '../shared';

const PAGE = 50;
const groups = [
  ['', 'All events'],
  ['tasks', 'Tasks'],
  ['status', 'Status changes'],
  ['phase', 'Phase changes'],
  ['priority', 'Priority'],
  ['deadlines', 'Deadlines'],
  ['planning', 'Planning and carryover'],
  ['timer', 'Timer'],
  ['time_entries', 'Manual time'],
  ['repositories', 'Repositories and branches'],
  ['deliveries', 'Deliveries'],
  ['projects', 'Projects'],
  ['workspaces', 'Workspaces'],
  ['journal', 'Journal, goals and reviews'],
] as const;

export function ActivityPage() {
  const app = useApp();
  const [types, setTypes] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [offset, setOffset] = useState(0);
  const projects = useProjects({ workspaceId: app.workspaceId, includeArchived: true });
  const activity = useActivity({
    workspaceId: app.workspaceId,
    projectId: projectId || undefined,
    types: types || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: PAGE,
    offset,
  });
  const total = activity.data?.total ?? 0;
  const reset = () => setOffset(0);
  return (
    <section className="card activity-card">
      <SectionHead
        title="A record of moving forward"
        subtitle={`${total} event${total === 1 ? '' : 's'} · append-only, never rewritten`}
      />
      <div className="toolbar-row">
        <select
          value={types}
          onChange={(e) => {
            setTypes(e.target.value);
            reset();
          }}
          aria-label="Event type"
        >
          {groups.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            reset();
          }}
          aria-label="Project"
        >
          <option value="">Any project</option>
          {(projects.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="date-input">
          From{' '}
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              reset();
            }}
            aria-label="From date"
          />
        </label>
        <label className="date-input">
          To{' '}
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              reset();
            }}
            aria-label="To date"
          />
        </label>
      </div>
      <ErrorNote error={activity.error} />
      <ActivityList events={activity.data?.items ?? []} showDate />
      {total > PAGE && (
        <div className="pager">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Newer
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE >= total}
            onClick={() => setOffset(offset + PAGE)}
          >
            Older
          </Button>
        </div>
      )}
    </section>
  );
}
