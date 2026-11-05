'use client';
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  Clock3,
  ChevronRight,
  GitBranch,
  Globe2,
  Leaf,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  Square,
  Timer as TimerIcon,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation, useGoals } from '@/lib/api/queries';
import type { ActivityView, TaskSummary, WorkspaceView } from '@/lib/api/types';
import { formatDuration, hoursLabel, weekdayShort, startOfWeek } from '@/lib/dates';
import { useApp, useStatusHelpers } from './context';
import { EmptyState, PriorityPill, SectionHead, WorkspaceTag } from './shared';
import { useTimerActions } from './timer-actions';
import { useTimerClock } from './timer-clock';

export const colorValue: Record<string, string> = {
  accent: '#bedf91',
  purple: '#a6b4e6',
  orange: '#d8ae7a',
  muted: '#8b918b',
};

/* ------------------------------------------------------------------ */

export function Metric({
  icon: Icon,
  label,
  value,
  unit,
  note,
  detail,
  progress,
  delivery,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  note: string;
  detail: string;
  progress?: number;
  delivery?: boolean;
}) {
  return (
    <section className="card metric">
      <div className="metric-label">
        <span>{label}</span>
        <Icon size={16} />
      </div>
      <div className="metric-number">
        {value}
        <span>{unit}</span>
        {delivery && (
          <span className="delivery-icon">
            <ShieldCheck size={24} />
          </span>
        )}
      </div>
      <p className="metric-note">{note}</p>
      <div className="metric-bottom">
        {progress !== undefined ? (
          <>
            <span className="metric-progress">
              <i style={{ width: `${Math.min(100, progress)}%` }} />
            </span>
            <span>{detail}</span>
          </>
        ) : (
          <span className={`metric-detail ${delivery ? 'delivery-detail' : ''}`}>
            {delivery ? <span className="live-dot" /> : <TrendingUp size={12} />}
            {detail}
          </span>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function FocusCard({ suggestion }: { suggestion?: TaskSummary }) {
  const app = useApp();
  const timer = useTimerActions();
  const seconds = useTimerClock(timer.state);
  const active = timer.state?.active;
  const title = active?.task.title ?? suggestion?.title;
  const meta = active
    ? `${app.workspaceLabel(active.task.workspaceId)} / ${active.task.projectName ?? 'No project'}${active.phaseName ? ` · ${active.phaseName}` : ''}`
    : suggestion
      ? `${app.workspaceLabel(suggestion.workspaceId)} / ${suggestion.projectName ?? 'No project'}`
      : 'Add a task to begin your focus session';
  return (
    <section className="card focus-card">
      <div className="focus-top">
        <span>
          <span className={`live-dot ${active?.status === 'running' ? 'live' : ''}`} />
          {active
            ? active.status === 'running'
              ? 'FOCUS SESSION'
              : 'SESSION PAUSED'
            : 'A LITTLE SPACE TO FOCUS'}
        </span>
        <TimerIcon size={17} />
      </div>
      <div className="focus-time" aria-live="off">
        {formatDuration(seconds)}
      </div>
      <p className="focus-title">
        {title ? (
          <button
            className="text-link"
            onClick={() => app.openTask((active?.task.id ?? suggestion?.id)!)}
          >
            {title}
          </button>
        ) : (
          'Your next great thing'
        )}
      </p>
      <p className="focus-meta">{meta}</p>
      <div className="focus-controls">
        {active ? (
          <>
            <Button className="focus-button" onClick={timer.toggle} disabled={timer.busy}>
              {active.status === 'running' ? (
                <Pause size={15} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              {active.status === 'running' ? 'Pause session' : 'Resume session'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => timer.stop()}
              disabled={timer.busy}
              aria-label="Stop and save session"
            >
              <Square size={13} fill="currentColor" />
            </Button>
          </>
        ) : (
          <Button
            className="focus-button"
            disabled={!suggestion || timer.busy}
            onClick={() => suggestion && timer.start(suggestion.id)}
          >
            <Play size={15} fill="currentColor" />
            Start focus session
          </Button>
        )}
      </div>
      <div className="focus-foot">
        <Leaf size={13} />
        <span>
          One thing at a time. Time is measured on the server, so it survives refreshes and devices.
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export type ChartDay = { day: string; byWorkspace: Record<string, number>; seconds: number };

export function TimeChart({
  days,
  totalSeconds,
  periodLabel,
  workspaces,
}: {
  days: ChartDay[];
  totalSeconds: number;
  periodLabel: string;
  workspaces: WorkspaceView[];
}) {
  const monthly = days.length > 8;
  const data = days.map((day) => {
    const row: Record<string, string | number> = {
      day: monthly ? String(Number(day.day.slice(8))) : weekdayShort(day.day),
    };
    for (const workspace of workspaces)
      row[workspace.id] = +((day.byWorkspace[workspace.id] ?? 0) / 3600).toFixed(2);
    return row;
  });
  const label = days.map((d) => `${d.day}: ${+(d.seconds / 3600).toFixed(2)} hours`).join(', ');
  return (
    <section className="card time-card">
      <SectionHead
        title="Your time, well spent"
        subtitle="Timer sessions and manual entries, never counted twice."
        action={
          <span className="chart-total">
            {hoursLabel(totalSeconds)}
            <small>{periodLabel.toLowerCase()}</small>
          </span>
        }
      />
      <div className="chart-wrap" role="img" aria-label={`Tracked time per day. ${label}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 7, left: -25, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              dy={9}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
              tickFormatter={(v) => `${v}h`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                `${Number(value).toFixed(1)}h`,
                workspaces.find((w) => w.id === name)?.name ?? name,
              ]}
            />
            {workspaces.map((workspace, index) => (
              <Area
                key={workspace.id}
                type="monotone"
                dataKey={workspace.id}
                stroke={colorValue[workspace.color] ?? colorValue.muted}
                strokeWidth={index === 0 ? 2 : 1.5}
                fill={
                  index === 0
                    ? `${colorValue[workspace.color] ?? colorValue.muted}22`
                    : 'transparent'
                }
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer">
        <div className="legend">
          {workspaces.map((workspace) => (
            <WorkspaceTag key={workspace.id} workspaceId={workspace.id} />
          ))}
        </div>
        <span>{periodLabel}</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function TaskRow({ task }: { task: TaskSummary }) {
  const app = useApp();
  const helpers = useStatusHelpers();
  const done = task.status.countsAsCompleted;
  const target = done
    ? helpers.reopenStatus(task.workspaceId)
    : helpers.completedStatus(task.workspaceId);
  const toggle = useApiMutation(
    (statusId: string) => api.post(`/tasks/${task.id}/status`, { statusId }),
    'tasks',
    { onSuccess: () => app.toast(done ? 'Task reopened' : 'Nicely done. Task completed.') },
  );
  return (
    <div className={`task-row ${done ? 'task-done' : ''}`}>
      <div className="task-title-cell">
        <button
          className={`task-check ${done ? 'checked' : ''} ${task.status.isActive ? 'in-progress' : ''}`}
          aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
          disabled={!target || toggle.isPending || Boolean(task.archivedAt)}
          onClick={() => target && toggle.mutate(target.id)}
        >
          {done ? <Check size={12} /> : task.status.isActive ? <span /> : null}
        </button>
        <button className="task-title" onClick={() => app.openTask(task.id)}>
          <span>{task.title}</span>
          <small>
            {task.reference} · {task.status.name}
            {task.projectName ? ` · ${task.projectName}` : ''}
            {task.subtaskCount
              ? ` · ${task.completedSubtaskCount}/${task.subtaskCount} subtasks`
              : ''}
          </small>
        </button>
      </div>
      <WorkspaceTag workspaceId={task.workspaceId} />
      <PriorityPill priority={task.priority} />
      <span className="estimate">
        <Clock3 size={12} />
        {task.estimatedMinutes ?? 0}m
      </span>
      <button
        className="row-open"
        aria-label={`Open ${task.title}`}
        onClick={() => app.openTask(task.id)}
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export function TaskTable({ tasks, empty }: { tasks: TaskSummary[]; empty: string }) {
  const app = useApp();
  return (
    <div className="task-table">
      <div className="table-head">
        <span>Task name</span>
        <span>Workspace</span>
        <span>Priority</span>
        <span>Estimate</span>
        <span />
      </div>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
      {!tasks.length && (
        <EmptyState
          action={
            <Button variant="outline" size="sm" onClick={() => app.openCreate()}>
              Add a task
            </Button>
          }
        >
          {empty}
        </EmptyState>
      )}
    </div>
  );
}

export function TodayTasksCard({
  tasks,
  title = 'Today’s plan',
  limit = 6,
}: {
  tasks: TaskSummary[];
  title?: string;
  limit?: number;
}) {
  const app = useApp();
  const [tab, setTab] = useTab();
  const open = tasks.filter((t) => !t.status.countsAsCompleted);
  const visible =
    tab === 'All tasks'
      ? tasks
      : tab === 'To do'
        ? open
        : tasks.filter((t) => t.status.countsAsCompleted);
  return (
    <section className="card task-card">
      <SectionHead
        title={title}
        subtitle={`${open.length} thing${open.length === 1 ? '' : 's'} to move forward. Make room for what matters.`}
        action={
          <Link className="text-link" href="/app/tasks">
            View all tasks
            <ArrowUpRight size={14} />
          </Link>
        }
      />
      <div className="task-tabs">
        {['All tasks', 'To do', 'Completed'].map((name) => (
          <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>
            {name}
            {name === 'All tasks' && <span>{tasks.length}</span>}
          </button>
        ))}
      </div>
      <TaskTable
        tasks={visible.slice(0, limit)}
        empty={
          tab === 'Completed'
            ? 'Completed tasks will appear here.'
            : 'A clear space for your next step.'
        }
      />
      <button className="add-row" onClick={() => app.openCreate({ plannedDate: app.today })}>
        <Plus size={15} />
        Add a task<span>Give your next step a name</span>
      </button>
    </section>
  );
}

import { useState } from 'react';
function useTab() {
  return useState('All tasks');
}

/* ------------------------------------------------------------------ */

export function BalanceCard({
  byWorkspace,
  totalSeconds,
}: {
  byWorkspace: { workspaceId: string; workspaceName: string; color: string; seconds: number }[];
  totalSeconds: number;
}) {
  const { workspaceId } = useApp();
  const rows = byWorkspace.filter((row) => !workspaceId || row.workspaceId === workspaceId);
  let cursor = 0;
  const stops = rows.map((row) => {
    const start = cursor;
    cursor += totalSeconds ? (row.seconds / totalSeconds) * 100 : 0;
    return `${colorValue[row.color] ?? colorValue.muted} ${start}% ${cursor}%`;
  });
  return (
    <section className="card balance-card">
      <SectionHead
        title="A balanced perspective"
        subtitle="Time across your workspaces"
        action={<Globe2 size={16} className="muted" />}
      />
      <div className="balance-main">
        <div
          className="donut"
          role="img"
          aria-label={`Time by workspace: ${rows.map((r) => `${r.workspaceName} ${hoursLabel(r.seconds)}`).join(', ')}`}
          style={{
            background: totalSeconds ? `conic-gradient(${stops.join(',')})` : 'var(--border)',
          }}
        >
          <div>
            <strong>{hoursLabel(totalSeconds)}</strong>
            <span>Total tracked</span>
          </div>
        </div>
      </div>
      <div className="balance-list">
        {rows.map((row) => (
          <div key={row.workspaceId}>
            <WorkspaceTag workspaceId={row.workspaceId} />
            <span>{hoursLabel(row.seconds)}</span>
            <small>{totalSeconds ? Math.round((row.seconds / totalSeconds) * 100) : 0}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function activityIcon(eventType: string) {
  if (eventType.startsWith('delivery')) return { Icon: ShieldCheck, symbol: 2 };
  if (eventType.includes('completed') || eventType.startsWith('goal'))
    return { Icon: Check, symbol: 1 };
  if (eventType.startsWith('timer') || eventType.startsWith('time_entry'))
    return { Icon: Clock3, symbol: 1 };
  return { Icon: GitBranch, symbol: 0 };
}

export function ActivityList({
  events,
  showDate = false,
}: {
  events: ActivityView[];
  showDate?: boolean;
}) {
  const app = useApp();
  return (
    <div className="activity-list">
      {events.map((event) => {
        const { Icon, symbol } = activityIcon(event.eventType);
        const time = new Date(event.occurredAt);
        return (
          <div className="activity-row" key={event.id}>
            <span className={`activity-symbol symbol-${symbol}`}>
              <Icon size={14} />
            </span>
            <div>
              {event.taskId ? (
                <button onClick={() => app.openTask(event.taskId!)}>{event.summary}</button>
              ) : (
                <p>{event.summary}</p>
              )}
              <small>
                {[event.detail, event.workspaceName, event.projectName].filter(Boolean).join(' · ')}
              </small>
            </div>
            <time dateTime={event.occurredAt}>
              {showDate
                ? time.toLocaleString('en', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                : time.toLocaleTimeString('en', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
            </time>
          </div>
        );
      })}
      {!events.length && <p className="empty">Your first activity will appear here.</p>}
    </div>
  );
}

export function ActivityCard({ events }: { events: ActivityView[] }) {
  return (
    <section className="card activity-card">
      <SectionHead
        title="The little things add up"
        subtitle="Your recent activity"
        action={
          <Link className="text-link" href="/app/activity">
            View timeline
            <ArrowUpRight size={14} />
          </Link>
        }
      />
      <ActivityList events={events.slice(0, 5)} />
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function GoalsCard({ weekOf }: { weekOf?: string }) {
  const app = useApp();
  const weekStart = startOfWeek(weekOf ?? app.today, app.settings.weekStartsOn);
  const goals = useGoals({ weekStart, workspaceId: app.workspaceId });
  const [title, setTitle] = useState('');
  const create = useApiMutation(
    (goalTitle: string) =>
      api.post('/goals', {
        title: goalTitle,
        weekStartDate: weekStart,
        workspaceId: app.workspaceId ?? null,
      }),
    'goals',
    { onSuccess: () => setTitle('') },
  );
  const update = useApiMutation(
    (input: { id: string; status: string }) =>
      api.patch(`/goals/${input.id}`, { status: input.status }),
    'goals',
  );
  const remove = useApiMutation((id: string) => api.delete(`/goals/${id}`), 'goals');
  const list = goals.data?.goals ?? [];
  const done = list.filter((g) => g.status === 'completed').length;
  return (
    <section className="card goals-card">
      <SectionHead
        title="Small steps, bigger picture"
        subtitle="This week’s intentions"
        action={
          <span className="goal-count">
            {done}/{list.length}
          </span>
        }
      />
      <div className="goal-progress">
        <span style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} />
      </div>
      {list.map((goal) => (
        <div key={goal.id} className="subtask-row">
          <button
            className={`goal-row ${goal.status === 'completed' ? 'goal-done' : ''}`}
            onClick={() =>
              update.mutate({
                id: goal.id,
                status: goal.status === 'completed' ? 'in_progress' : 'completed',
              })
            }
            aria-pressed={goal.status === 'completed'}
          >
            <span className="task-check">{goal.status === 'completed' && <Check size={11} />}</span>
            {goal.title}
          </button>
          {goal.workspaceName && <small>{goal.workspaceName}</small>}
          <button
            className="row-open"
            aria-label={`Remove goal ${goal.title}`}
            onClick={() => remove.mutate(goal.id)}
          >
            ×
          </button>
        </div>
      ))}
      {!list.length && !goals.isLoading && (
        <p className="detail-hint">Set a few intentions for the week.</p>
      )}
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) create.mutate(title.trim());
        }}
      >
        <input
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a weekly goal"
          aria-label="New weekly goal"
        />
        <Button type="submit" size="sm" variant="outline" disabled={create.isPending}>
          Add
        </Button>
      </form>
    </section>
  );
}

export { CircleCheck };
