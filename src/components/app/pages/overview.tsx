'use client';
import { AlertTriangle, CalendarClock, CircleCheck, Clock3, Code2, Target } from 'lucide-react';
import { useActivity, useOverview } from '@/lib/api/queries';
import { formatIsoDate, hoursLabel } from '@/lib/dates';
import type { TaskSummary } from '@/lib/api/types';
import { useApp } from '../context';
import {
  ActivityCard,
  BalanceCard,
  FocusCard,
  GoalsCard,
  Metric,
  TimeChart,
  TodayTasksCard,
} from '../cards';
import { LoadingRows, SectionHead } from '../shared';

const periodLabels = { today: 'Today', week: 'This week', month: 'This month' } as const;

export function OverviewPage() {
  const app = useApp();
  const overview = useOverview({ period: app.period, workspaceId: app.workspaceId });
  const activity = useActivity({ workspaceId: app.workspaceId, limit: 6 });
  const data = overview.data;
  if (!data) return <LoadingRows rows={8} />;
  const hidden = app.hiddenWidgets;
  const plannedPercent = data.plannedToday.total
    ? Math.round((data.plannedToday.completed / data.plannedToday.total) * 100)
    : 0;
  const suggestion = data.plannedToday.tasks.find((t) => !t.status.countsAsCompleted);
  const workspaces = app.activeWorkspaces.filter(
    (w) => !app.workspaceId || w.id === app.workspaceId,
  );
  return (
    <>
      <div className="metrics-grid">
        <Metric
          icon={CircleCheck}
          label="Tasks completed"
          value={String(data.plannedToday.completed)}
          unit={`/ ${data.plannedToday.total}`}
          note="of today’s planned tasks"
          detail={`${plannedPercent}% complete`}
          progress={plannedPercent}
        />
        <Metric
          icon={Clock3}
          label="Time invested"
          value={String(Math.floor(data.tracked.totalSeconds / 3600))}
          unit={`h ${Math.floor((data.tracked.totalSeconds % 3600) / 60)}m`}
          note={`${data.tracked.sessions} timer sessions · ${data.tracked.manualEntries} manual entries`}
          detail={periodLabels[app.period].toLowerCase()}
        />
        <Metric
          icon={Target}
          label="Weekly completion"
          value={data.week.rate === null ? '—' : String(data.week.rate)}
          unit={data.week.rate === null ? '' : '%'}
          note={`${data.week.completed} of ${data.week.planned} tasks planned this week`}
          detail={`${data.week.carriedOver} carried over`}
          progress={data.week.rate ?? 0}
        />
        <Metric
          icon={Code2}
          label="Production verified"
          value={String(data.deliveries.productionVerified)}
          unit={data.deliveries.productionVerified === 1 ? 'delivery' : 'deliveries'}
          note={`${data.deliveries.productionDeployed} deployed · ${data.deliveries.merged} merged`}
          detail="Successful records only"
          delivery
        />
      </div>
      <div className="dashboard-grid top-grid">
        {!hidden.includes('Time overview') && (
          <TimeChart
            days={data.tracked.byDay}
            totalSeconds={data.tracked.totalSeconds}
            periodLabel={periodLabels[app.period]}
            workspaces={workspaces}
          />
        )}
        <FocusCard suggestion={suggestion} />
      </div>
      <div className="dashboard-grid middle-grid">
        {!hidden.includes('Today’s tasks') && <TodayTasksCard tasks={data.plannedToday.tasks} />}
        {!hidden.includes('Workspace balance') && (
          <BalanceCard
            byWorkspace={data.tracked.byWorkspace}
            totalSeconds={data.tracked.totalSeconds}
          />
        )}
      </div>
      <div className="dashboard-grid middle-grid">
        <AttentionCard
          overdue={data.attention.overdue}
          blocked={data.attention.blocked}
          carryover={data.attention.carryoverCandidates}
        />
        <UpcomingCard tasks={data.upcoming} />
      </div>
      <div className="dashboard-grid bottom-grid">
        {!hidden.includes('Recent activity') && (
          <ActivityCard events={activity.data?.items ?? []} />
        )}
        {!hidden.includes('Weekly goals') && <GoalsCard />}
      </div>
    </>
  );
}

function MiniTaskList({
  tasks,
  empty,
  meta,
}: {
  tasks: TaskSummary[];
  empty: string;
  meta: (t: TaskSummary) => string;
}) {
  const app = useApp();
  if (!tasks.length) return <p className="detail-hint">{empty}</p>;
  return (
    <div className="activity-list">
      {tasks.map((task) => (
        <div className="subtask-row" key={task.id}>
          <button className="text-link" onClick={() => app.openTask(task.id)}>
            {task.title}
          </button>
          <small>{meta(task)}</small>
        </div>
      ))}
    </div>
  );
}

function AttentionCard({
  overdue,
  blocked,
  carryover,
}: {
  overdue: TaskSummary[];
  blocked: TaskSummary[];
  carryover: TaskSummary[];
}) {
  return (
    <section className="card">
      <SectionHead
        title="Needs your attention"
        subtitle="Overdue, blocked and unfinished from earlier days"
        action={<AlertTriangle size={16} className="muted" />}
      />
      <h3 className="detail-history-heading">Overdue</h3>
      <MiniTaskList
        tasks={overdue}
        empty="Nothing overdue."
        meta={(t) => `due ${t.dueDate ? formatIsoDate(t.dueDate) : ''}`}
      />
      <h3 className="detail-history-heading">Blocked or waiting</h3>
      <MiniTaskList tasks={blocked} empty="Nothing blocked." meta={(t) => t.status.name} />
      <h3 className="detail-history-heading">Planned earlier, still open</h3>
      <MiniTaskList
        tasks={carryover}
        empty="No unfinished work from earlier days."
        meta={(t) => (t.plannedDate ? formatIsoDate(t.plannedDate) : '')}
      />
    </section>
  );
}

function UpcomingCard({ tasks }: { tasks: TaskSummary[] }) {
  return (
    <section className="card">
      <SectionHead
        title="Upcoming deadlines"
        subtitle="Due in the next seven days"
        action={<CalendarClock size={16} className="muted" />}
      />
      <MiniTaskList
        tasks={tasks}
        empty="No deadlines this week."
        meta={(t) =>
          `${t.dueDate ? formatIsoDate(t.dueDate, { weekday: true }) : ''}${t.estimatedMinutes ? ` · ${hoursLabel(t.estimatedMinutes * 60)}` : ''}`
        }
      />
    </section>
  );
}
