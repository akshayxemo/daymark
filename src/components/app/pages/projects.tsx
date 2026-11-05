'use client';
import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation, useProjects } from '@/lib/api/queries';
import type { ProjectSummary } from '@/lib/api/types';
import { useApp } from '../context';
import { ErrorNote, LoadingRows, Modal, WorkspaceTag } from '../shared';

export function ProjectsPage() {
  const app = useApp();
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState<ProjectSummary | 'new' | null>(null);
  const [confirm, setConfirm] = useState<ProjectSummary | null>(null);
  const projects = useProjects({ workspaceId: app.workspaceId, includeArchived: true });
  const archive = useApiMutation(
    (input: { id: string; archived: boolean }) =>
      api.post(`/projects/${input.id}/${input.archived ? 'archive' : 'restore'}`),
    'projects',
    {
      onSuccess: (_, input) => {
        setConfirm(null);
        app.toast(
          input.archived ? 'Project archived. Tasks and history were kept.' : 'Project restored',
        );
      },
    },
  );
  const list = (projects.data ?? []).filter((p) => Boolean(p.archivedAt) === showArchived);
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
        <Button onClick={() => setEditor('new')}>
          <Plus size={15} />
          New project
        </Button>
      </div>
      {projects.isLoading && <LoadingRows rows={4} />}
      <div className="project-grid">
        {list.map((project) => (
          <section className="card project-card" key={project.id}>
            <div className="project-icon">
              <FolderKanban size={23} />
            </div>
            <WorkspaceTag workspaceId={project.workspaceId} />
            <h2>{project.name}</h2>
            {project.description && <p>{project.description}</p>}
            <p>
              {project.taskCount} tasks · {project.completedCount} completed ·{' '}
              {project.status.replace('_', ' ')}
              {project.dueDate ? ` · due ${project.dueDate}` : ''}
            </p>
            <div className="goal-progress">
              <span
                style={{
                  width: `${project.taskCount ? (project.completedCount / project.taskCount) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="project-actions">
              <Button variant="outline" size="sm" onClick={() => setEditor(project)}>
                Edit
              </Button>
              {project.archivedAt ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archive.mutate({ id: project.id, archived: false })}
                >
                  Restore
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirm(project)}>
                  Archive
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  app.openCreate({ workspaceId: project.workspaceId, projectId: project.id })
                }
              >
                Add task
              </Button>
            </div>
          </section>
        ))}
      </div>
      {!projects.isLoading && list.length === 0 && (
        <div className="card empty">
          {showArchived
            ? 'No archived projects here.'
            : 'No projects here yet. Create one to get started.'}
        </div>
      )}
      {editor && (
        <ProjectEditor project={editor === 'new' ? null : editor} onClose={() => setEditor(null)} />
      )}
      {confirm && (
        <Modal title="Archive project?" onClose={() => setConfirm(null)}>
          <div className="task-form">
            <p>
              Archive “{confirm.name}”? Its tasks, time records and activity remain available, and
              you can restore the project later.
            </p>
            <ErrorNote error={archive.error} />
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => archive.mutate({ id: confirm.id, archived: true })}
                disabled={archive.isPending}
              >
                Archive project
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProjectEditor({
  project,
  onClose,
}: {
  project: ProjectSummary | null;
  onClose: () => void;
}) {
  const app = useApp();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [workspaceId, setWorkspaceId] = useState(
    project?.workspaceId ?? app.workspaceId ?? app.activeWorkspaces[0]?.id ?? '',
  );
  const [status, setStatus] = useState(project?.status ?? 'active');
  const [dueDate, setDueDate] = useState(project?.dueDate ?? '');
  const save = useApiMutation(
    () =>
      project
        ? api.patch(`/projects/${project.id}`, {
            name,
            description,
            status,
            dueDate: dueDate || null,
          })
        : api.post('/projects', {
            workspaceId,
            name,
            description,
            status,
            dueDate: dueDate || null,
          }),
    'projects',
    {
      onSuccess: () => {
        app.toast(project ? 'Project updated' : 'Project created');
        onClose();
      },
    },
  );
  const issues = save.error instanceof ApiError ? save.error.issues : {};
  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined);
        }}
      >
        <p>Organize related tasks in one workspace.</p>
        <label>
          Project name
          <input
            autoFocus
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {issues.name && <span className="field-error">{issues.name}</span>}
        </label>
        <div className="form-grid">
          <label>
            Workspace
            {project ? (
              <input value={app.workspaceLabel(project.workspaceId)} disabled />
            ) : (
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)}>
                {app.activeWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {save.error && !issues.name && <ErrorNote error={save.error} />}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
