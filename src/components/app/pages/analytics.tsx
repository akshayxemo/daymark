'use client';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReport } from '@/lib/api/queries';
import { formatIsoDate, hoursLabel, rangeForPeriod } from '@/lib/dates';
import { useApp } from '../context';
import { colorValue } from '../cards';
import { LoadingRows, SectionHead } from '../shared';

export function AnalyticsPage() {
  const app = useApp();
  const range = rangeForPeriod(app.period, app.today, app.settings.weekStartsOn);
  const report = useReport({ ...range, workspaceId: app.workspaceId });
  const data = report.data;
  if (!data) return <LoadingRows rows={8} />;
  const daily = data.daily.map((d) => ({
    ...d,
    label: formatIsoDate(d.day),
    hours: +(d.trackedSeconds / 3600).toFixed(2),
  }));
  const maxProject = Math.max(1, ...data.time.byProject.map((p) => p.seconds));
  const maxPhase = Math.max(1, ...data.time.byPhase.map((p) => p.seconds));
  const maxOpen = Math.max(1, ...data.phases.map((p) => p.total));
  return (
    <div className="page-stack">
      <div className="stat-grid">
        <div className="stat">
          <strong>{data.completion.completed}</strong>
          <span>tasks completed</span>
        </div>
        <div className="stat">
          <strong>{data.completion.created}</strong>
          <span>tasks created</span>
        </div>
        <div className="stat">
          <strong>{hoursLabel(data.time.totalSeconds)}</strong>
          <span>time invested</span>
        </div>
        <div className="stat">
          <strong>{data.estimation.ratio ?? '—'}</strong>
          <span>actual ÷ estimate (1.0 = on target)</span>
        </div>
        <div className="stat">
          <strong>{data.cycleTime.averageCalendarHours ?? '—'}h</strong>
          <span>avg calendar cycle time</span>
        </div>
        <div className="stat">
          <strong>{data.cycleTime.averageActiveHours ?? '—'}h</strong>
          <span>avg active cycle time</span>
        </div>
        <div className="stat">
          <strong>
            {data.deliveries.deliveryRate === null ? '—' : `${data.deliveries.deliveryRate}%`}
          </strong>
          <span>
            dev tasks delivered to production ({data.deliveries.deliveredTasks}/
            {data.deliveries.eligibleTasks})
          </span>
        </div>
        <div className="stat">
          <strong>
            {data.deliveries.verificationRate === null
              ? '—'
              : `${data.deliveries.verificationRate}%`}
          </strong>
          <span>verified in production ({data.deliveries.verifiedTasks})</span>
        </div>
      </div>

      <section className="card">
        <SectionHead
          title="Daily activity"
          subtitle={`${formatIsoDate(data.range.from)} – ${formatIsoDate(data.range.to)}`}
        />
        <div
          className="chart-wrap tall"
          role="img"
          aria-label={`Daily completed tasks and tracked hours: ${daily.map((d) => `${d.label}: ${d.completed} completed, ${d.hours} hours`).join('; ')}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="hours"
                name="Hours tracked"
                fill={colorValue.accent}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="completed"
                name="Tasks completed"
                fill={colorValue.purple}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="dashboard-grid middle-grid">
        <section className="card">
          <SectionHead
            title="Workspace distribution"
            subtitle="Time and completions per workspace"
          />
          <div className="bar-list">
            {data.time.byWorkspace
              .filter((row) => !app.workspaceId || row.workspaceId === app.workspaceId)
              .map((row) => {
                const done =
                  data.completion.byWorkspace.find((w) => w.workspaceId === row.workspaceId)
                    ?.completed ?? 0;
                return (
                  <div className="bar-row" key={row.workspaceId}>
                    <span>{row.workspaceName}</span>
                    <span>
                      {hoursLabel(row.seconds)} · {done} done
                    </span>
                    <div className="goal-progress">
                      <span
                        style={{
                          width: `${data.time.totalSeconds ? (row.seconds / data.time.totalSeconds) * 100 : 0}%`,
                          background: colorValue[row.color],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
        <section className="card">
          <SectionHead title="Project distribution" subtitle="Where tracked time went" />
          <div className="bar-list">
            {data.time.byProject.map((row) => (
              <div className="bar-row" key={`${row.projectId}-${row.workspaceName}`}>
                <span>
                  {row.projectName} <small className="muted">{row.workspaceName}</small>
                </span>
                <span>
                  {hoursLabel(row.seconds)} · {row.completed} done
                </span>
                <div className="goal-progress">
                  <span style={{ width: `${(row.seconds / maxProject) * 100}%` }} />
                </div>
              </div>
            ))}
            {!data.time.byProject.length && (
              <p className="empty">No project time in this period.</p>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid middle-grid">
        <section className="card">
          <SectionHead
            title="Time by phase"
            subtitle="Effort recorded against each implementation phase"
          />
          <div className="bar-list">
            {data.time.byPhase.map((row) => (
              <div className="bar-row" key={row.phaseName}>
                <span>{row.phaseName}</span>
                <span>{hoursLabel(row.seconds)}</span>
                <div className="goal-progress">
                  <span style={{ width: `${(row.seconds / maxPhase) * 100}%` }} />
                </div>
              </div>
            ))}
            {!data.time.byPhase.length && <p className="empty">No phase time recorded.</p>}
          </div>
        </section>
        <section className="card">
          <SectionHead title="Open work by phase" subtitle="Where unfinished tasks sit right now" />
          <div className="bar-list">
            {data.phases.map((row) => (
              <div className="bar-row" key={row.phaseName}>
                <span>{row.phaseName}</span>
                <span>{row.total}</span>
                <div className="goal-progress">
                  <span style={{ width: `${(row.total / maxOpen) * 100}%` }} />
                </div>
              </div>
            ))}
            {!data.phases.length && <p className="empty">No open tasks.</p>}
          </div>
        </section>
      </div>

      <div className="dashboard-grid middle-grid">
        <section className="card">
          <SectionHead
            title="Estimated versus actual"
            subtitle="Completed tasks with both an estimate and tracked time"
          />
          <table className="config-table">
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Estimate</th>
                <th scope="col">Actual</th>
                <th scope="col">Ratio</th>
              </tr>
            </thead>
            <tbody>
              {data.estimation.tasks.slice(0, 12).map((row) => (
                <tr key={row.taskId}>
                  <td>
                    <button className="text-link" onClick={() => app.openTask(row.taskId)}>
                      {row.reference} {row.title}
                    </button>
                  </td>
                  <td>{row.estimatedMinutes}m</td>
                  <td>{row.actualMinutes}m</td>
                  <td>{row.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.estimation.tasks.length && (
            <p className="empty">No completed tasks with estimates and time yet.</p>
          )}
        </section>
        <section className="card">
          <SectionHead title="Carryover trend" subtitle="Tasks carried forward per planning week" />
          <table className="config-table">
            <thead>
              <tr>
                <th scope="col">Week of</th>
                <th scope="col">Planned</th>
                <th scope="col">Carried over</th>
                <th scope="col">Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.carryover.map((row) => (
                <tr key={row.week}>
                  <td>{formatIsoDate(row.week)}</td>
                  <td>{row.planned}</td>
                  <td>{row.carriedOver}</td>
                  <td>{row.rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.carryover.length && <p className="empty">No planning records in this period.</p>}
        </section>
      </div>

      <section className="card">
        <SectionHead
          title="Deliveries by environment"
          subtitle="Successful merges, deployments and verifications. Failed records are shown separately and never counted as delivered."
        />
        <table className="config-table">
          <thead>
            <tr>
              <th scope="col">Environment</th>
              <th scope="col">Merged</th>
              <th scope="col">Deployed</th>
              <th scope="col">Verified</th>
              <th scope="col">Failed</th>
            </tr>
          </thead>
          <tbody>
            {data.deliveries.successfulByEnvironment.map((row) => (
              <tr key={row.environment}>
                <td>{row.environment}</td>
                <td>{row.merged}</td>
                <td>{row.deployed}</td>
                <td>{row.verified}</td>
                <td>{row.failed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="insight-note">
        <TrendingUp size={18} />
        <div>
          <strong>Progress has more than one dimension.</strong>
          <p>
            Completion measures execution. Tracked time measures effort. Deliveries record outcomes.
            Each tells its own part of your story, so Daymark never combines them into one score.
          </p>
        </div>
      </div>
    </div>
  );
}
