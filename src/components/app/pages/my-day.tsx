'use client';
import { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation, useDailyReview, useTasks, useTimeRecords } from '@/lib/api/queries';
import { addDays, formatIsoDate, hoursLabel } from '@/lib/dates';
import type { DailyReviewView } from '@/lib/api/types';
import { useApp } from '../context';
import { FocusCard, TodayTasksCard } from '../cards';
import { ErrorNote, SectionHead } from '../shared';

export function MyDayPage() {
  const app = useApp();
  const [date, setDate] = useState(app.today);
  const planned = useTasks({
    plannedFrom: date,
    plannedTo: date,
    workspaceId: app.workspaceId,
    limit: 100,
    sort: 'planned',
    order: 'asc',
  });
  const carry = useTasks({
    plannedTo: addDays(date, -1),
    completed: false,
    workspaceId: app.workspaceId,
    limit: 20,
    sort: 'planned',
    order: 'asc',
  });
  const time = useTimeRecords({ from: date, to: date, workspaceId: app.workspaceId, limit: 200 });
  const tasks = planned.data?.items ?? [];
  const estimate = tasks.reduce((n, t) => n + (t.estimatedMinutes ?? 0), 0);
  const tracked = (time.data ?? []).reduce((n, r) => n + r.durationSeconds, 0);
  const carryOver = useApiMutation(
    () =>
      api.post<{ moved: number }>('/tasks/carry-over', {
        fromDate: addDays(date, -1),
        toDate: date,
        workspaceId: app.workspaceId,
      }),
    'tasks',
    {
      onSuccess: (result) =>
        app.toast(
          `${result.moved} task${result.moved === 1 ? '' : 's'} carried over. Original plans were kept.`,
        ),
    },
  );
  const moveOne = useApiMutation(
    (taskId: string) =>
      api.post(`/tasks/${taskId}/plan`, { plannedDate: date, reason: 'carryover' }),
    'tasks',
  );
  const leftovers = carry.data?.items ?? [];
  return (
    <div className="page-stack">
      <div className="toolbar-row">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="Previous day"
        >
          ←
        </Button>
        <label className="date-input">
          Day{' '}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Selected day"
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Next day"
        >
          →
        </Button>
        {date !== app.today && (
          <Button variant="ghost" size="sm" onClick={() => setDate(app.today)}>
            Today
          </Button>
        )}
      </div>
      <div className="stat-grid">
        <div className="stat">
          <strong>{tasks.length}</strong>
          <span>planned for {formatIsoDate(date, { weekday: true })}</span>
        </div>
        <div className="stat">
          <strong>{tasks.filter((t) => t.status.countsAsCompleted).length}</strong>
          <span>completed</span>
        </div>
        <div className="stat">
          <strong>{hoursLabel(estimate * 60)}</strong>
          <span>estimated workload</span>
        </div>
        <div className="stat">
          <strong>{hoursLabel(tracked)}</strong>
          <span>actually tracked</span>
        </div>
      </div>
      <div className="dashboard-grid middle-grid">
        <TodayTasksCard
          tasks={tasks}
          title={date === app.today ? 'Today’s plan' : `Plan for ${formatIsoDate(date)}`}
          limit={50}
        />
        <FocusCard suggestion={tasks.find((t) => !t.status.countsAsCompleted)} />
      </div>
      {leftovers.length > 0 && (
        <section className="card">
          <SectionHead
            title="Carry work forward"
            subtitle="Open tasks planned for earlier days. Carrying over keeps the original plan in history."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => carryOver.mutate(undefined)}
                disabled={carryOver.isPending}
              >
                Carry yesterday’s over
              </Button>
            }
          />
          {leftovers.map((task) => (
            <div className="subtask-row" key={task.id}>
              <button className="text-link" onClick={() => app.openTask(task.id)}>
                {task.title}
              </button>
              <small>planned {task.plannedDate ? formatIsoDate(task.plannedDate) : ''}</small>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveOne.mutate(task.id)}
                aria-label={`Move ${task.title} to this day`}
              >
                <ArrowRight size={13} />
                Move here
              </Button>
            </div>
          ))}
          <ErrorNote error={carryOver.error ?? moveOne.error} />
        </section>
      )}
      <DailyReview date={date} />
    </div>
  );
}

export function DailyReview({ date }: { date: string }) {
  const review = useDailyReview({ date });
  if (review.isLoading) return null;
  // Remount the form whenever another day (or a freshly saved record) is loaded.
  return (
    <ReviewForm
      key={`${date}-${review.data?.updatedAt ?? 'new'}`}
      date={date}
      review={review.data ?? null}
    />
  );
}

function ReviewForm({ date, review: data }: { date: string; review: DailyReviewView | null }) {
  const app = useApp();
  const review = { data };
  const [values, setValues] = useState({
    notes: data?.notes ?? '',
    accomplishments: data?.accomplishments ?? '',
    blockers: data?.blockers ?? '',
    learnings: data?.learnings ?? '',
    tomorrowPriorities: data?.tomorrowPriorities ?? '',
  });
  const [rating, setRating] = useState<number | null>(data?.rating ?? null);
  const [dirty, setDirty] = useState(false);
  const save = useApiMutation(
    (reviewed: boolean) => api.put('/reviews', { reviewDate: date, ...values, rating, reviewed }),
    'review',
    {
      onSuccess: (_, reviewed) => {
        setDirty(false);
        app.toast(reviewed ? 'Daily review completed' : 'Saved');
      },
    },
  );
  const field = (key: keyof typeof values, label: string, placeholder: string) => (
    <label>
      {label}
      <textarea
        value={values[key]}
        placeholder={placeholder}
        onChange={(e) => {
          setValues((v) => ({ ...v, [key]: e.target.value }));
          setDirty(true);
        }}
      />
    </label>
  );
  return (
    <section className="card journal-card">
      <SectionHead
        title="Leave a note for yourself"
        subtitle="What went well? What did you learn? What will you carry into tomorrow?"
        action={<BookOpen size={19} className="muted" />}
      />
      <div className="task-form">
        {field('notes', 'Daily notes', 'Today, I made progress on…')}
        <div className="review-grid">
          {field('accomplishments', 'Accomplishments', 'What got done?')}
          {field('blockers', 'Blockers', 'What slowed you down?')}
          {field('learnings', 'Learnings', 'What did you learn?')}
          {field('tomorrowPriorities', 'Tomorrow', 'What matters most tomorrow?')}
        </div>
        <div className="rating-row" role="group" aria-label="Rate your day">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={rating === n ? 'active' : ''}
              aria-pressed={rating === n}
              onClick={() => {
                setRating(rating === n ? null : n);
                setDirty(true);
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <ErrorNote error={save.error} />
        <div className="form-actions">
          <span className="journal-footer">
            <span>
              <span className="live-dot" />
              {review.data?.reviewedAt
                ? 'Reviewed'
                : dirty
                  ? 'Unsaved changes'
                  : 'Saved to your account'}
            </span>
          </span>
          <Button
            variant="outline"
            onClick={() => save.mutate(false)}
            disabled={save.isPending || !dirty}
          >
            Save
          </Button>
          <Button onClick={() => save.mutate(true)} disabled={save.isPending}>
            {review.data?.reviewedAt ? 'Update review' : 'Complete the day'}
          </Button>
        </div>
      </div>
    </section>
  );
}
