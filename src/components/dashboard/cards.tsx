'use client';
import {
  Timer as TimerIcon,
  Pause,
  Play,
  Square,
  Leaf,
  ArrowUpRight,
  Check,
  CircleCheck,
  Clock3,
  ChevronRight,
  Plus,
  Globe2,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
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
import { WorkspaceTag, SectionHead } from './shared';
import {
  formatDuration,
  isCompleted,
  workspaces,
  type Task,
  type State,
  type Session,
  type Activity,
} from '@/lib/model';
import type { Dispatch, SetStateAction } from 'react';

export function FocusCard({
  state,
  focusTask,
  runningSeconds,
  pauseTimer,
  stopTimer,
  startTimer,
}: {
  state: State;
  focusTask: Task | undefined;
  runningSeconds: number;
  pauseTimer: () => void;
  stopTimer: () => void;
  startTimer: (task: Task) => void;
}) {
  return (
    <section className="card focus-card">
      <div className="focus-top">
        <span>
          <span className={`live-dot ${state.timer?.startedAt ? 'live' : ''}`} />
          {state.timer
            ? state.timer.startedAt
              ? 'FOCUS SESSION'
              : 'SESSION PAUSED'
            : 'A LITTLE SPACE TO FOCUS'}
        </span>
        <TimerIcon size={17} />
      </div>
      <div className="focus-time">{formatDuration(runningSeconds)}</div>
      <p className="focus-title">{focusTask?.title || 'Your next great thing'}</p>
      <p className="focus-meta">
        {focusTask
          ? `${focusTask.workspace} / ${focusTask.project}`
          : 'Add a task to begin your focus session'}
      </p>
      <div className="focus-controls">
        {state.timer ? (
          <>
            <Button className="focus-button" onClick={pauseTimer}>
              {state.timer.startedAt ? (
                <Pause size={15} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              {state.timer.startedAt ? 'Pause session' : 'Resume session'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={stopTimer}
              aria-label="Stop and save session"
            >
              <Square size={13} fill="currentColor" />
            </Button>
          </>
        ) : (
          <Button
            className="focus-button"
            disabled={!focusTask}
            onClick={() => focusTask && startTimer(focusTask)}
          >
            <Play size={15} fill="currentColor" />
            Start focus session
          </Button>
        )}
      </div>
      <div className="focus-foot">
        <Leaf size={13} />
        <span>One thing at a time. You’ve got this.</span>
      </div>
    </section>
  );
}

export function TimeChart({
  hoursLabel,
  totalSeconds,
  period,
  chartDays,
}: {
  hoursLabel: (seconds: number) => string;
  totalSeconds: number;
  period: string;
  chartDays: { day: string; Office: number; Personal: number; Learning: number }[];
}) {
  return (
    <section className="card time-card">
      <SectionHead
        title="Your time, well spent"
        subtitle="A little perspective on where your hours go."
        action={
          <span className="chart-total">
            {hoursLabel(totalSeconds)}
            <small>{period.toLowerCase()}</small>
          </span>
        }
      />
      <div
        className="chart-wrap"
        role="img"
        aria-label={`Tracked time for this period: ${chartDays.map((d) => `${d.day} ${+(d.Office + d.Personal + d.Learning).toFixed(2)} hours`).join(', ')}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartDays} margin={{ top: 8, right: 7, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="officeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bedf91" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#bedf91" stopOpacity={0.01} />
              </linearGradient>
            </defs>
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
              formatter={(v) => `${Number(v).toFixed(1)}h`}
            />
            <Area
              type="monotone"
              dataKey="Office"
              stroke="#bedf91"
              strokeWidth={2}
              fill="url(#officeFill)"
            />
            <Area
              type="monotone"
              dataKey="Personal"
              stroke="#a6b4e6"
              strokeWidth={1.5}
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="Learning"
              stroke="#d8ae7a"
              strokeWidth={1.5}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer">
        <div className="legend">
          {workspaces.map((w) => (
            <WorkspaceTag key={w} name={w} />
          ))}
        </div>
        <span>{period}</span>
      </div>
    </section>
  );
}

export function TasksCard({
  page,
  scopedTasks,
  todayTasks,
  completed,
  setCreate,
  navigate,
  taskTab,
  setTaskTab,
  visibleTasks,
  updateTask,
  setSelected,
}: {
  page: string;
  scopedTasks: Task[];
  todayTasks: Task[];
  completed: number;
  setCreate: Dispatch<SetStateAction<boolean>>;
  navigate: (name: string) => void;
  taskTab: string;
  setTaskTab: Dispatch<SetStateAction<string>>;
  visibleTasks: Task[];
  updateTask: (id: string, changes: Partial<Task>) => void;
  setSelected: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <section className="card task-card">
      <SectionHead
        title={page === 'Tasks' ? 'All your tasks' : 'Today’s plan'}
        subtitle={
          page === 'Tasks'
            ? `${scopedTasks.length} tasks across your workspace`
            : `${todayTasks.length - completed} things to move forward. Make room for what matters.`
        }
        action={
          <button
            className="text-link"
            onClick={() => (page === 'Tasks' ? setCreate(true) : navigate('Tasks'))}
          >
            {page === 'Tasks' ? 'Add task' : 'View all tasks'}
            <ArrowUpRight size={14} />
          </button>
        }
      />
      <div className="task-tabs">
        {['All tasks', 'To do', 'Completed'].map((t) => (
          <button key={t} className={taskTab === t ? 'active' : ''} onClick={() => setTaskTab(t)}>
            {t}
            {t === 'All tasks' && (
              <span>{page === 'Tasks' ? scopedTasks.length : todayTasks.length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="task-table">
        <div className="table-head">
          <span>Task name</span>
          <span>Workspace</span>
          <span>Priority</span>
          <span>Estimate</span>
          <span />
        </div>
        {visibleTasks.slice(0, page === 'Tasks' ? 100 : 5).map((t) => (
          <div key={t.id} className={`task-row ${isCompleted(t) ? 'task-done' : ''}`}>
            <div className="task-title-cell">
              <button
                className={`task-check ${isCompleted(t) ? 'checked' : ''} ${t.status === 'active' ? 'in-progress' : ''}`}
                aria-label={`${isCompleted(t) ? 'Reopen' : 'Complete'} ${t.title}`}
                onClick={() => updateTask(t.id, { status: isCompleted(t) ? 'planned' : 'done' })}
              >
                {isCompleted(t) ? <Check size={12} /> : t.status === 'active' ? <span /> : null}
              </button>
              <button className="task-title" onClick={() => setSelected(t.id)}>
                <span>{t.title}</span>
                <small>{t.project}</small>
              </button>
            </div>
            <WorkspaceTag name={t.workspace} />
            <span className={`priority ${t.priority.toLowerCase()}`}>
              <span />
              {t.priority}
            </span>
            <span className="estimate">
              <Clock3 size={12} />
              {t.estimate}m
            </span>
            <button
              className="row-open"
              aria-label={`Open ${t.title}`}
              onClick={() => setSelected(t.id)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        ))}
        {!visibleTasks.length && (
          <div className="empty">
            <CircleCheck size={24} />
            <p>
              {taskTab === 'Completed'
                ? 'Completed tasks will appear here.'
                : 'A clear space for your next step.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => setCreate(true)}>
              Add a task
            </Button>
          </div>
        )}
      </div>
      <button className="add-row" onClick={() => setCreate(true)}>
        <Plus size={15} />
        Add a task<span>Give your next step a name</span>
      </button>
    </section>
  );
}

export function BalanceCard({
  state,
  periodSessions,
  totalSeconds,
  hoursLabel,
  workspace,
}: {
  state: State;
  periodSessions: Session[];
  totalSeconds: number;
  hoursLabel: (seconds: number) => string;
  workspace: State['workspace'];
}) {
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
          style={{
            background: (() => {
              let n = 0;
              const stops = workspaces.map((w, i) => {
                const seconds = periodSessions
                  .filter((s) => state.tasks.find((t) => t.id === s.taskId)?.workspace === w)
                  .reduce((n, s) => n + s.seconds, 0);
                const start = n;
                n += totalSeconds ? (seconds / totalSeconds) * 100 : 0;
                return `${['#bfdf95', '#a6b4e6', '#d8ae7a'][i]} ${start}% ${n}%`;
              });
              return totalSeconds ? `conic-gradient(${stops.join(',')})` : 'var(--border)';
            })(),
          }}
        >
          <div>
            <strong>{hoursLabel(totalSeconds)}</strong>
            <span>Total tracked</span>
          </div>
        </div>
      </div>
      <div className="balance-list">
        {workspaces
          .filter((w) => workspace === 'All workspaces' || w === workspace)
          .map((w) => {
            const seconds = periodSessions
              .filter((s) => state.tasks.find((t) => t.id === s.taskId)?.workspace === w)
              .reduce((n, s) => n + s.seconds, 0);
            return (
              <div key={w}>
                <WorkspaceTag name={w} />
                <span>{hoursLabel(seconds)}</span>
                <small>{totalSeconds ? Math.round((seconds / totalSeconds) * 100) : 0}%</small>
              </div>
            );
          })}
      </div>
    </section>
  );
}

export function ActivityCard({
  page,
  navigate,
  events,
  setSelected,
}: {
  page: string;
  navigate: (name: string) => void;
  events: Activity[];
  setSelected: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <section className="card activity-card">
      <SectionHead
        title="The little things add up"
        subtitle="Your recent activity"
        action={
          <button className="text-link" onClick={() => navigate('Activity')}>
            View timeline
            <ArrowUpRight size={14} />
          </button>
        }
      />
      <div className="activity-list">
        {events.slice(0, page === 'Activity' ? 100 : 4).map((a, i) => (
          <div className="activity-row" key={a.id}>
            <span className={`activity-symbol symbol-${i % 3}`}>
              {i % 3 === 0 ? (
                <GitBranch size={14} />
              ) : i % 3 === 1 ? (
                <Check size={14} />
              ) : (
                <ShieldCheck size={14} />
              )}
            </span>
            <div>
              {a.taskId ? (
                <button onClick={() => setSelected(a.taskId!)}>{a.title}</button>
              ) : (
                <p>{a.title}</p>
              )}
              <small>{a.detail}</small>
            </div>
            <time>
              {new Date(a.time).toLocaleTimeString('en', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </time>
          </div>
        ))}
        {!events.length && <p className="empty">Your first activity will appear here.</p>}
      </div>
    </section>
  );
}

export function GoalsCard({
  state,
  setState,
}: {
  state: State;
  setState: Dispatch<SetStateAction<State | null>>;
}) {
  return (
    <section className="card goals-card">
      <SectionHead
        title="Small steps, bigger picture"
        subtitle="This week’s intentions"
        action={<span className="goal-count">{state.goals.filter(Boolean).length}/4</span>}
      />
      <div className="goal-progress">
        <span style={{ width: `${state.goals.filter(Boolean).length * 25}%` }} />
      </div>
      {[
        'Lay the foundation for Daymark',
        'Make time for movement',
        'Finish the workspace experience',
        'Read two chapters this week',
      ].map((g, i) => (
        <button
          className={`goal-row ${state.goals[i] ? 'goal-done' : ''}`}
          key={g}
          onClick={() =>
            setState((p) => (p ? { ...p, goals: p.goals.map((v, n) => (n === i ? !v : v)) } : p))
          }
        >
          <span className="task-check">{state.goals[i] && <Check size={11} />}</span>
          {g}
        </button>
      ))}
    </section>
  );
}
