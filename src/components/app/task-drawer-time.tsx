'use client';
import { Clock3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation } from '@/lib/api/queries';
import type { TaskDetail } from '@/lib/api/types';
import { formatIsoDate, hoursLabel } from '@/lib/dates';
import { useApp, useStatusHelpers } from './context';
import { ErrorNote } from './shared';

type Mode = 'duration' | 'range';

export function TaskDrawerTime({ task }: { task: TaskDetail }) {
  const app = useApp();
  const helpers = useStatusHelpers();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('duration');
  const [workDate, setWorkDate] = useState(app.today);
  const [minutes, setMinutes] = useState('30');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [phaseId, setPhaseId] = useState(task.phaseId ?? '');
  const [description, setDescription] = useState('');
  const [allowOverlap, setAllowOverlap] = useState(false);

  const add = useApiMutation(
    (input: Record<string, unknown>) => api.post('/time/entries', input),
    'time',
    {
      onSuccess: () => {
        app.toast('Manual time recorded');
        setOpen(false);
        setDescription('');
        setAllowOverlap(false);
      },
    },
  );
  const remove = useApiMutation(
    (entryId: string) => api.delete(`/time/entries/${entryId}`),
    'time',
    {
      onSuccess: () => app.toast('Time entry removed. The change was audited.'),
    },
  );
  const conflict = add.error instanceof ApiError && add.error.status === 409 ? add.error : null;
  const phases = helpers.phasesFor(task.workspaceId, task.taskTypeId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const base = { taskId: task.id, phaseId: phaseId || null, description, allowOverlap };
    if (mode === 'duration') {
      add.mutate({ ...base, workDate, durationMinutes: Number(minutes) });
    } else {
      add.mutate({
        ...base,
        startedAt: start ? new Date(start).toISOString() : undefined,
        endedAt: end ? new Date(end).toISOString() : undefined,
      });
    }
  };

  const records = [
    ...task.sessions.map((session) => ({
      id: session.id,
      kind: 'session' as const,
      when: session.startedAt.toString().slice(0, 10),
      seconds: session.durationSeconds,
      label:
        session.description ||
        (session.status === 'completed' ? 'Focus session' : `Session (${session.status})`),
      phase: session.phaseName,
      startedAt: session.startedAt,
    })),
    ...task.timeEntries.map((entry) => ({
      id: entry.id,
      kind: 'manual' as const,
      when: entry.workDate,
      seconds: entry.durationSeconds,
      label: entry.description || 'Manual entry',
      phase: entry.phaseName,
      startedAt: entry.startedAt,
    })),
  ].sort((a, b) => String(b.startedAt ?? b.when).localeCompare(String(a.startedAt ?? a.when)));

  return (
    <section className="drawer-section">
      <div className="drawer-section-head">
        <h3>Time</h3>
        {!task.archivedAt && (
          <button className="text-link" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Add manual time'}
          </button>
        )}
      </div>
      {open && (
        <form className="task-form compact" onSubmit={submit}>
          <div className="task-tabs">
            <button
              type="button"
              className={mode === 'duration' ? 'active' : ''}
              onClick={() => setMode('duration')}
            >
              Duration
            </button>
            <button
              type="button"
              className={mode === 'range' ? 'active' : ''}
              onClick={() => setMode('range')}
            >
              Start and end
            </button>
          </div>
          <div className="form-grid">
            {mode === 'duration' ? (
              <>
                <label>
                  Date
                  <input
                    type="date"
                    value={workDate}
                    onChange={(event) => setWorkDate(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Minutes
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Start
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    required
                  />
                </label>
                <label>
                  End
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
            <label>
              Phase
              <select value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
                <option value="">No phase</option>
                {phases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Note
              <input
                value={description}
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What did you work on?"
              />
            </label>
          </div>
          {conflict && (
            <div className="project-error" role="alert">
              <p>
                {conflict.message} Overlapping time is never counted twice in totals, but you can
                record it deliberately.
              </p>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={allowOverlap}
                  onChange={(event) => setAllowOverlap(event.target.checked)}
                />
                I understand, record it anyway
              </label>
            </div>
          )}
          {add.error && !conflict && <ErrorNote error={add.error} />}
          <div className="form-actions">
            <Button type="submit" size="sm" disabled={add.isPending}>
              Save time
            </Button>
          </div>
        </form>
      )}
      {records.length === 0 && (
        <p className="detail-hint">No time recorded yet. Start the timer or add a manual entry.</p>
      )}
      {records.slice(0, 12).map((record) => (
        <div className="session-row" key={`${record.kind}-${record.id}`}>
          <Clock3 size={16} />
          <span className="session-label">
            {record.label}
            <small>
              {record.kind === 'manual' ? 'Manual' : 'Timer'}
              {record.phase ? ` · ${record.phase}` : ''}
            </small>
          </span>
          <time>{formatIsoDate(record.when)}</time>
          <strong>{hoursLabel(record.seconds)}</strong>
          {record.kind === 'manual' && !task.archivedAt && (
            <button
              className="row-open"
              aria-label="Delete entry"
              onClick={() => remove.mutate(record.id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
