'use client';
import { useState } from 'react';
import type { TaskDetail } from '@/lib/api/types';

function when(value: string | Date): string {
  return new Date(value).toLocaleString();
}

/** Status, phase and planning history plus the task's activity timeline. */
export function TaskDrawerHistory({ task }: { task: TaskDetail }) {
  const [tab, setTab] = useState<'activity' | 'status' | 'phase' | 'plans'>('activity');
  return (
    <section className="drawer-section">
      <div className="drawer-section-head">
        <h3>History</h3>
      </div>
      <p className="detail-hint">Every change is kept. Nothing here can be edited or deleted.</p>
      <div className="task-tabs">
        {(
          [
            ['activity', `Activity (${task.timeline.length})`],
            ['status', `Status (${task.statusHistory.length})`],
            ['phase', `Phase (${task.phaseHistory.length})`],
            ['plans', `Plans (${task.plans.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'activity' &&
        task.timeline.map((event) => (
          <div className="detail-event" key={event.id}>
            <span className="live-dot" />
            <div>
              <p>{event.summary}</p>
              {event.detail && <small>{event.detail}</small>}
              <time>{when(event.occurredAt)}</time>
            </div>
          </div>
        ))}
      {tab === 'status' &&
        task.statusHistory.map((entry) => (
          <div className="detail-event" key={entry.id}>
            <span className="live-dot" />
            <div>
              <p>
                {entry.previousStatusName ? `${entry.previousStatusName} → ` : ''}
                {entry.newStatusName}
              </p>
              {entry.reason && <small>{entry.reason}</small>}
              <time>{when(entry.changedAt)}</time>
            </div>
          </div>
        ))}
      {tab === 'phase' &&
        task.phaseHistory.map((entry) => (
          <div className="detail-event" key={entry.id}>
            <span className="live-dot" />
            <div>
              <p>
                {entry.previousPhaseName ? `${entry.previousPhaseName} → ` : ''}
                {entry.newPhaseName ?? 'No phase'}
              </p>
              {entry.notes && <small>{entry.notes}</small>}
              <time>{when(entry.changedAt)}</time>
            </div>
          </div>
        ))}
      {tab === 'plans' &&
        task.plans.map((entry) => (
          <div className="detail-event" key={entry.id}>
            <span className="live-dot" />
            <div>
              <p>
                {entry.reason === 'unplanned'
                  ? `Removed from the plan${entry.previousPlannedDate ? ` for ${entry.previousPlannedDate}` : ''}`
                  : entry.previousPlannedDate
                    ? `${entry.reason === 'carryover' ? 'Carried over' : 'Moved'} from ${entry.previousPlannedDate} to ${entry.plannedDate}`
                    : `Planned for ${entry.plannedDate}`}
              </p>
              {entry.plannedMinutes ? <small>{entry.plannedMinutes} minutes planned</small> : null}
              <time>{when(entry.createdAt)}</time>
            </div>
          </div>
        ))}
      {((tab === 'activity' && !task.timeline.length) ||
        (tab === 'status' && !task.statusHistory.length) ||
        (tab === 'phase' && !task.phaseHistory.length) ||
        (tab === 'plans' && !task.plans.length)) && <p className="empty">Nothing recorded yet.</p>}
    </section>
  );
}
