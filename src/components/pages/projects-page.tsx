'use client';
import { Plus, FolderKanban, CircleCheck, Circle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceTag } from '@/components/dashboard/shared';
import { isCompleted, type Project, type State } from '@/lib/model';
import type { Dispatch, SetStateAction } from 'react';
type Props = {
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>>;
  setProjectError: Dispatch<SetStateAction<string>>;
  setProjectEditor: Dispatch<SetStateAction<Project | 'new' | null>>;
  projects: Project[];
  workspace: State['workspace'];
  state: State;
  setProjectArchived: (p: Project, archived: boolean) => void;
  setArchiveProject: Dispatch<SetStateAction<Project | null>>;
  setSelected: Dispatch<SetStateAction<string | null>>;
};
export function ProjectsPage({
  showArchived,
  setShowArchived,
  setProjectError,
  setProjectEditor,
  projects,
  workspace,
  state,
  setProjectArchived,
  setArchiveProject,
  setSelected,
}: Props) {
  return (
    <>
      <div className="project-toolbar">
        <div className="project-filter">
          <Button
            variant={showArchived ? 'ghost' : 'outline'}
            onClick={() => setShowArchived(false)}
          >
            Active projects
          </Button>
          <Button
            variant={showArchived ? 'outline' : 'ghost'}
            onClick={() => setShowArchived(true)}
          >
            Archived projects
          </Button>
        </div>
        <Button
          onClick={() => {
            setProjectError('');
            setProjectEditor('new');
          }}
        >
          <Plus size={15} />
          New project
        </Button>
      </div>
      <div className="project-grid">
        {projects
          .filter(
            (p) =>
              p.archived === showArchived &&
              (workspace === 'All workspaces' || p.workspace === workspace),
          )
          .map((p) => {
            const tasks = state.tasks.filter(
              (t) => t.workspace === p.workspace && t.project === p.name,
            );
            const done = tasks.filter(isCompleted).length;
            return (
              <section className="card project-card" key={p.id}>
                <div className="project-icon">
                  <FolderKanban size={23} />
                </div>
                <WorkspaceTag name={p.workspace} />
                <h2>{p.name}</h2>
                {p.description && <p>{p.description}</p>}
                <p>
                  {tasks.length} tasks · {done} completed
                </p>
                <div className="goal-progress">
                  <span style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
                </div>
                <div className="project-actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProjectError('');
                      setProjectEditor(p);
                    }}
                  >
                    Edit
                  </Button>
                  {p.archived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProjectArchived(p, false)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setArchiveProject(p)}>
                      Archive
                    </Button>
                  )}
                </div>
                {tasks.map((t) => (
                  <button className="project-task" key={t.id} onClick={() => setSelected(t.id)}>
                    {isCompleted(t) ? <CircleCheck size={14} /> : <Circle size={14} />}
                    <span>{t.title}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </section>
            );
          })}
      </div>
      {projects.filter(
        (p) =>
          p.archived === showArchived &&
          (workspace === 'All workspaces' || p.workspace === workspace),
      ).length === 0 && (
        <div className="card empty">
          {showArchived
            ? 'No archived projects here.'
            : 'No projects here yet. Create one to get started.'}
        </div>
      )}
    </>
  );
}
