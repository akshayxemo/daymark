'use client';
import { BookOpen, TrendingUp, ShieldCheck, type LucideIcon } from 'lucide-react';
import { SectionHead } from './shared';
import type { State } from '@/lib/model';
export function Metric({
  icon: Icon,
  label,
  value,
  unit,
  note,
  detail,
  progress,
  spark,
  bars,
  delivery,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  note: string;
  detail: string;
  progress?: number;
  spark?: boolean;
  bars?: boolean;
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
        {spark && (
          <svg viewBox="0 0 100 36" className="sparkline" aria-hidden="true">
            <path
              d="M2 31 L13 25 L24 28 L35 17 L45 20 L55 13 L66 17 L78 6 L88 10 L98 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
        {bars && (
          <div className="mini-bars" aria-hidden="true">
            {[12, 19, 15, 26, 20, 33, 26, 37, 32].map((n, i) => (
              <i key={i} style={{ height: n }} />
            ))}
          </div>
        )}
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
              <i style={{ width: `${progress}%` }} />
            </span>
            <span>{detail}</span>
          </>
        ) : (
          <>
            <span className={`metric-detail ${delivery ? 'delivery-detail' : ''}`}>
              {delivery ? <span className="live-dot" /> : <TrendingUp size={12} />}
              {detail}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
export function Journal({
  state,
  setState,
}: {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State | null>>;
}) {
  return (
    <section className="card journal-card">
      <SectionHead
        title="Leave a note for yourself"
        subtitle="What went well? What did you learn? What will you carry into tomorrow?"
        action={<BookOpen size={19} className="muted" />}
      />
      <textarea
        aria-label="Daily journal"
        placeholder="Today, I made progress on…"
        value={state.journal}
        onChange={(e) => setState((p) => (p ? { ...p, journal: e.target.value } : p))}
      />
      <div className="journal-footer">
        <span>
          <span className="live-dot" />
          Saved automatically in this browser
        </span>
        <span>{state.journal.trim() ? state.journal.trim().split(/\s+/).length : 0} words</span>
      </div>
    </section>
  );
}
