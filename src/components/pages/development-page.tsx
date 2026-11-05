'use client';
import { Code2, GitBranch, ArrowUpRight, ShieldCheck, Check } from 'lucide-react';
import { SectionHead } from '@/components/dashboard/shared';
import type { Task, State } from '@/lib/model';
import type { Dispatch, SetStateAction } from 'react';
type Props = {
  scopedTasks: Task[];
  setSelected: Dispatch<SetStateAction<string | null>>;
  workspace: State['workspace'];
};
export function DevelopmentPage({ scopedTasks, setSelected, workspace }: Props) {
  return (
    <section className="card development">
      <SectionHead
        title="The work behind the work"
        subtitle="Sample repository and delivery references for the Daymark project."
        action={<span className="demo-badge">DEMO RECORDS</span>}
      />
      <div className="repo-head">
        <span className="project-icon">
          <Code2 size={25} />
        </span>
        <div>
          <h2>daymark / platform</h2>
          <p>Private reference · main branch</p>
        </div>
        <span className="status-pill">Active development</span>
      </div>
      <div className="development-grid">
        <div>
          <h3>
            <GitBranch size={15} />
            In development
          </h3>
          {scopedTasks
            .filter((t) => t.workspace === 'Office')
            .map((t) => (
              <button className="dev-task" key={t.id} onClick={() => setSelected(t.id)}>
                <span>{t.id}</span>
                <strong>{t.title}</strong>
                <small>{t.phase}</small>
                <ArrowUpRight size={14} />
              </button>
            ))}
        </div>
        <div>
          <h3>
            <ShieldCheck size={15} />
            Delivery log
          </h3>
          {workspace === 'All workspaces' || workspace === 'Office' ? (
            <div className="delivery-record">
              <span className="status-pill">Verified</span>
              <h2>Foundation release</h2>
              <p>v0.1.0 · Production</p>
              <ol>
                <li>
                  <Check size={13} />
                  Implementation completed
                </li>
                <li>
                  <Check size={13} />
                  Changes merged to main
                </li>
                <li>
                  <Check size={13} />
                  Deployed to production
                </li>
                <li>
                  <Check size={13} />
                  Production verification passed
                </li>
              </ol>
              <small>This is a sample delivery, separate from task completion.</small>
            </div>
          ) : (
            <p className="empty">No development deliveries in this workspace.</p>
          )}
        </div>
      </div>
    </section>
  );
}
