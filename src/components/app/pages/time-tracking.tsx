'use client';
import { Clock3, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOverview, useTimeRecords } from '@/lib/api/queries';
import { formatIsoDate, hoursLabel, rangeForPeriod } from '@/lib/dates';
import { useApp } from '../context';
import { FocusCard, TimeChart } from '../cards';
import { LoadingRows, SectionHead, WorkspaceTag } from '../shared';

const PAGE = 50;
const labels = { today: 'Today', week: 'This week', month: 'This month' } as const;

export function TimeTrackingPage() {
  const app = useApp();
  const [offset, setOffset] = useState(0);
  const range = rangeForPeriod(app.period, app.today, app.settings.weekStartsOn);
  const overview = useOverview({ period: app.period, workspaceId: app.workspaceId });
  const records = useTimeRecords({ ...range, workspaceId: app.workspaceId, limit: PAGE, offset });
  const workspaces = app.activeWorkspaces.filter(
    (w) => !app.workspaceId || w.id === app.workspaceId,
  );
  const totals = overview.data?.tracked;
  return (
    <div className="page-stack">
      <div className="dashboard-grid top-grid">
        {totals ? (
          <TimeChart
            days={totals.byDay}
            totalSeconds={totals.totalSeconds}
            periodLabel={labels[app.period]}
            workspaces={workspaces}
          />
        ) : (
          <LoadingRows rows={5} />
        )}
        <FocusCard
          suggestion={overview.data?.plannedToday.tasks.find((t) => !t.status.countsAsCompleted)}
        />
      </div>
      {totals && (
        <div className="stat-grid">
          <div className="stat">
            <strong>{hoursLabel(totals.totalSeconds)}</strong>
            <span>{labels[app.period].toLowerCase()}</span>
          </div>
          <div className="stat">
            <strong>{totals.sessions}</strong>
            <span>timer sessions</span>
          </div>
          <div className="stat">
            <strong>{totals.manualEntries}</strong>
            <span>manual entries</span>
          </div>
          <div className="stat">
            <strong>{Math.round(totals.longestSessionSeconds / 60)}m</strong>
            <span>longest focus session</span>
          </div>
        </div>
      )}
      <section className="card">
        <SectionHead
          title="Session history"
          subtitle="Timer sessions measured on the server, and manual entries with an audit trail. Add manual time from a task."
          action={
            <Button asChild variant="outline" size="sm">
              <a href={`/api/v1/export/csv?type=time&from=${range.from}&to=${range.to}`}>
                <Download size={13} />
                CSV
              </a>
            </Button>
          }
        />
        {records.isLoading && <LoadingRows />}
        {(records.data ?? []).map((record) => (
          <div className="session-row" key={`${record.kind}-${record.id}`}>
            <Clock3 size={16} />
            <span className="session-label">
              <button className="text-link" onClick={() => app.openTask(record.taskId)}>
                {record.taskTitle}
              </button>
              <small>
                {record.kind === 'manual' ? 'Manual entry' : 'Timer'}
                {record.phaseName ? ` · ${record.phaseName}` : ''}
                {record.description ? ` · ${record.description}` : ''}
              </small>
            </span>
            <WorkspaceTag workspaceId={record.workspaceId} />
            <time>{formatIsoDate(record.workDate)}</time>
            <strong>{hoursLabel(record.durationSeconds)}</strong>
          </div>
        ))}
        {!records.isLoading && !records.data?.length && (
          <p className="empty">No time recorded in this period.</p>
        )}
        {((records.data?.length ?? 0) === PAGE || offset > 0) && (
          <div className="pager">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE))}
            >
              Newer
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(records.data?.length ?? 0) < PAGE}
              onClick={() => setOffset(offset + PAGE)}
            >
              Older
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
