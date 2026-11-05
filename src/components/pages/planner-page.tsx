'use client';
import { Plus } from 'lucide-react';
import { localDate, statuses, type Task } from '@/lib/model';
import { WorkspaceTag, SectionHead } from '@/components/dashboard/shared';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
type Props = {
  plannerDate: string;
  setPlannerDate: Dispatch<SetStateAction<string>>;
  scopedTasks: Task[];
  today: string;
  dropDate: string | null;
  setDropDate: Dispatch<SetStateAction<string | null>>;
  draggedTask: string | null;
  setDraggedTask: Dispatch<SetStateAction<string | null>>;
  updateTask: (id: string, changes: Partial<Task>) => void;
  setSelected: Dispatch<SetStateAction<string | null>>;
  setCreate: Dispatch<SetStateAction<boolean>>;
  goalsCard: ReactNode;
};
export function PlannerPage({
  plannerDate,
  setPlannerDate,
  scopedTasks,
  today,
  dropDate,
  setDropDate,
  draggedTask,
  setDraggedTask,
  updateTask,
  setSelected,
  setCreate,
  goalsCard,
}: Props) {
  return (
    <>
      <section className="card planner">
        <SectionHead
          title="Your weekly canvas"
          subtitle="Drag tasks between days, or open a task to change its date."
          action={
            <label className="date-input">
              Week of{' '}
              <input
                type="date"
                aria-label="Planner week"
                value={plannerDate}
                onChange={(e) => setPlannerDate(e.target.value)}
              />
            </label>
          }
        />
        <div className="planner-days">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(`${plannerDate}T12:00:00`);
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i);
            const date = localDate(d);
            const tasks = scopedTasks.filter((t) => t.date === date);
            return (
              <div
                className={`planner-day ${date === today ? 'is-today' : ''} ${dropDate === date ? 'is-drop-target' : ''}`}
                key={date}
                onDragOver={(e) => {
                  if (!draggedTask) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropDate(date);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropDate(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedTask) updateTask(draggedTask, { date });
                  setDraggedTask(null);
                  setDropDate(null);
                }}
              >
                <div className="planner-day-head">
                  <span>{d.toLocaleDateString('en', { weekday: 'short' })}</span>
                  <strong>{d.getDate()}</strong>
                  <small>{tasks.reduce((n, t) => n + t.estimate, 0)}m planned</small>
                </div>
                {tasks.map((t) => (
                  <button
                    className="planner-task"
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', t.id);
                      setDraggedTask(t.id);
                    }}
                    onDragEnd={() => {
                      setDraggedTask(null);
                      setDropDate(null);
                    }}
                    onClick={() => setSelected(t.id)}
                  >
                    <WorkspaceTag name={t.workspace} />
                    <strong>{t.title}</strong>
                    <span>
                      {t.estimate}m · {statuses.find((s) => s.id === t.status)?.name}
                    </span>
                  </button>
                ))}
                <button
                  className="planner-add"
                  aria-label={`Add task for ${date}`}
                  onClick={() => {
                    setPlannerDate(date);
                    setCreate(true);
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
      {goalsCard}
    </>
  );
}
