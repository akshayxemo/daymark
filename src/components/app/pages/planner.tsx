'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation, useTasks, useTimeRecords } from '@/lib/api/queries';
import { addDays, eachDay, endOfWeek, hoursLabel, startOfWeek, weekdayShort } from '@/lib/dates';
import { useApp } from '../context';
import { GoalsCard } from '../cards';
import { ErrorNote, SectionHead, WorkspaceTag } from '../shared';

export function PlannerPage() {
  const app = useApp();
  const [anchor, setAnchor] = useState(app.today);
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const from = startOfWeek(anchor, app.settings.weekStartsOn);
  const to = endOfWeek(anchor, app.settings.weekStartsOn);
  const tasks = useTasks({
    plannedFrom: from,
    plannedTo: to,
    workspaceId: app.workspaceId,
    limit: 200,
    sort: 'planned',
    order: 'asc',
  });
  const time = useTimeRecords({ from, to, workspaceId: app.workspaceId, limit: 200 });
  const move = useApiMutation(
    (input: { taskId: string; date: string }) =>
      api.post(`/tasks/${input.taskId}/plan`, { plannedDate: input.date }),
    'tasks',
    { onSuccess: () => app.toast('Moved. The original plan is kept in history.') },
  );
  const items = tasks.data?.items ?? [];
  const days = eachDay(from, to);
  const planned = items.length;
  const completed = items.filter((t) => t.status.countsAsCompleted).length;
  const estimate = items.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);
  const tracked = (time.data ?? []).reduce((n, r) => n + r.durationSeconds, 0);
  return (
    <div className="page-stack">
      <div className="stat-grid">
        <div className="stat">
          <strong>{planned}</strong>
          <span>tasks planned this week</span>
        </div>
        <div className="stat">
          <strong>{completed}</strong>
          <span>completed</span>
        </div>
        <div className="stat">
          <strong>{hoursLabel(estimate * 60)}</strong>
          <span>planned effort</span>
        </div>
        <div className="stat">
          <strong>{hoursLabel(tracked)}</strong>
          <span>actual tracked</span>
        </div>
      </div>
      <section className="card planner">
        <SectionHead
          title="Your weekly canvas"
          subtitle="Drag tasks between days, or open a task to change its date. Every move is recorded."
          action={
            <div className="toolbar-row">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnchor(addDays(from, -7))}
                aria-label="Previous week"
              >
                ←
              </Button>
              <label className="date-input">
                Week of{' '}
                <input
                  type="date"
                  aria-label="Planner week"
                  value={from}
                  onChange={(e) => e.target.value && setAnchor(e.target.value)}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnchor(addDays(from, 7))}
                aria-label="Next week"
              >
                →
              </Button>
            </div>
          }
        />
        <div className="planner-days">
          {days.map((date) => {
            const dayTasks = items.filter((t) => t.plannedDate === date);
            const dayTracked = (time.data ?? [])
              .filter((r) => r.workDate === date)
              .reduce((n, r) => n + r.durationSeconds, 0);
            return (
              <div
                key={date}
                className={`planner-day ${date === app.today ? 'is-today' : ''} ${dropDate === date ? 'is-drop-target' : ''}`}
                onDragOver={(e) => {
                  if (!dragged) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropDate(date);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropDate(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const task = items.find((t) => t.id === dragged);
                  if (task && task.plannedDate !== date) move.mutate({ taskId: task.id, date });
                  setDragged(null);
                  setDropDate(null);
                }}
              >
                <div className="planner-day-head">
                  <span>{weekdayShort(date)}</span>
                  <strong>{Number(date.slice(8))}</strong>
                  <small>
                    {dayTasks.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0)}m planned ·{' '}
                    {Math.round(dayTracked / 60)}m tracked
                  </small>
                </div>
                {dayTasks.map((task) => (
                  <button
                    key={task.id}
                    className="planner-task"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', task.id);
                      setDragged(task.id);
                    }}
                    onDragEnd={() => {
                      setDragged(null);
                      setDropDate(null);
                    }}
                    onClick={() => app.openTask(task.id)}
                  >
                    <WorkspaceTag workspaceId={task.workspaceId} />
                    <strong>{task.title}</strong>
                    <span>
                      {task.estimatedMinutes ?? 0}m · {task.status.name}
                    </span>
                  </button>
                ))}
                <button
                  className="planner-add"
                  aria-label={`Add task for ${date}`}
                  onClick={() => app.openCreate({ plannedDate: date })}
                >
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <ErrorNote error={move.error} />
      </section>
      <GoalsCard weekOf={from} />
    </div>
  );
}
