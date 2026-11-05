'use client';
import { Code2, ExternalLink, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation, useDeliveries, useRepositories, useTasks } from '@/lib/api/queries';
import type { RepositoryView } from '@/lib/api/types';
import { formatIsoDate } from '@/lib/dates';
import { useApp } from '../context';
import { ErrorNote, LoadingRows, Modal, SectionHead, WorkspaceTag } from '../shared';

export function DevelopmentPage() {
  const app = useApp();
  const [editor, setEditor] = useState<RepositoryView | 'new' | null>(null);
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState('');
  const repos = useRepositories({ workspaceId: app.workspaceId, includeArchived: true });
  const deliveries = useDeliveries({
    workspaceId: app.workspaceId,
    environment: environment || undefined,
    deliveryStatus: status || undefined,
    limit: 50,
  });
  const active = useTasks({
    workspaceId: app.workspaceId,
    statusCategory: 'active',
    limit: 20,
    sort: 'updated',
    order: 'desc',
  });
  const archive = useApiMutation(
    (input: { id: string; archived: boolean }) =>
      api.post(`/repositories/${input.id}/${input.archived ? 'archive' : 'restore'}`),
    'repositories',
  );
  return (
    <div className="page-stack">
      <section className="card development">
        <SectionHead
          title="The work behind the work"
          subtitle="Repositories you work in. Link them to tasks with branches, Jira tickets and pull requests."
          action={
            <Button size="sm" onClick={() => setEditor('new')}>
              <Plus size={14} />
              Add repository
            </Button>
          }
        />
        {repos.isLoading && <LoadingRows />}
        {(repos.data ?? []).length === 0 && !repos.isLoading && (
          <p className="empty">
            No repositories yet. References are entered manually; no GitHub or Jira access is
            needed.
          </p>
        )}
        {(repos.data ?? []).map((repo) => (
          <div className="repo-head" key={repo.id}>
            <span className="project-icon">
              <Code2 size={22} />
            </span>
            <div>
              <h2>
                {repo.repositoryUrl ? (
                  <a href={repo.repositoryUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {repo.name} <ExternalLink size={12} />
                  </a>
                ) : (
                  repo.name
                )}
              </h2>
              <p>
                {repo.provider} · {repo.defaultBranch ?? 'no default branch'} · {repo.taskCount}{' '}
                tasks · {repo.deliveryCount} successful deliveries
              </p>
              <WorkspaceTag workspaceId={repo.workspaceId} />
            </div>
            <span className={`status-pill ${repo.archivedAt ? 'muted' : ''}`}>
              {repo.archivedAt ? 'Archived' : 'Active'}
            </span>
            <Button variant="outline" size="sm" onClick={() => setEditor(repo)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => archive.mutate({ id: repo.id, archived: !repo.archivedAt })}
            >
              {repo.archivedAt ? 'Restore' : 'Archive'}
            </Button>
          </div>
        ))}
      </section>
      <div className="dashboard-grid middle-grid">
        <section className="card">
          <SectionHead title="In development" subtitle="Tasks in an active status" />
          {(active.data?.items ?? []).map((task) => (
            <button className="dev-task" key={task.id} onClick={() => app.openTask(task.id)}>
              <span>{task.reference}</span>
              <strong>{task.title}</strong>
              <small>{task.phaseName ?? task.status.name}</small>
            </button>
          ))}
          {!active.data?.items.length && <p className="empty">Nothing in progress right now.</p>}
        </section>
        <section className="card">
          <SectionHead
            title="Delivery log"
            subtitle="Merges, deployments and production verification, recorded separately."
            action={<ShieldCheck size={16} className="muted" />}
          />
          <div className="toolbar-row">
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              aria-label="Environment"
            >
              <option value="">All environments</option>
              {['development', 'staging', 'uat', 'production', 'other'].map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Outcome">
              <option value="">Any outcome</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          {(deliveries.data ?? []).map((delivery) => (
            <div className="delivery-row" key={delivery.id}>
              <span className={`status-pill ${delivery.deliveryStatus}`}>
                {delivery.deliveryStatus}
              </span>
              <div>
                <button className="text-link" onClick={() => app.openTask(delivery.taskId)}>
                  {delivery.deliveryType === 'verified'
                    ? 'Verified'
                    : delivery.deliveryType === 'deployed'
                      ? 'Deployed'
                      : 'Merged'}{' '}
                  · {delivery.environment}
                  {delivery.version ? ` · ${delivery.version}` : ''}
                </button>
                <small>
                  {delivery.taskReference} {delivery.taskTitle}
                  {delivery.repositoryName ? ` · ${delivery.repositoryName}` : ''}
                </small>
              </div>
              <time>{formatIsoDate(String(delivery.deliveredAt).slice(0, 10))}</time>
              {delivery.referenceUrl ? (
                <a
                  className="text-link"
                  href={delivery.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label="Open delivery link"
                >
                  <ExternalLink size={13} />
                </a>
              ) : (
                <span />
              )}
            </div>
          ))}
          {!deliveries.data?.length && (
            <p className="empty">Record deliveries from a task’s detail panel.</p>
          )}
        </section>
      </div>
      {editor && (
        <RepositoryEditor
          repository={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function RepositoryEditor({
  repository,
  onClose,
}: {
  repository: RepositoryView | null;
  onClose: () => void;
}) {
  const app = useApp();
  const [values, setValues] = useState({
    workspaceId: repository?.workspaceId ?? app.workspaceId ?? app.activeWorkspaces[0]?.id ?? '',
    name: repository?.name ?? '',
    owner: repository?.owner ?? '',
    provider: repository?.provider ?? 'github',
    repositoryUrl: repository?.repositoryUrl ?? '',
    defaultBranch: repository?.defaultBranch ?? 'main',
    description: repository?.description ?? '',
  });
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const save = useApiMutation(
    () => {
      const body = {
        ...values,
        owner: values.owner || null,
        defaultBranch: values.defaultBranch || null,
      };
      if (repository) {
        const { workspaceId: _workspaceId, ...rest } = body;
        return api.patch(`/repositories/${repository.id}`, rest);
      }
      return api.post('/repositories', body);
    },
    'repositories',
    { onSuccess: onClose },
  );
  const issues = save.error instanceof ApiError ? save.error.issues : {};
  return (
    <Modal title={repository ? 'Edit repository' : 'Add repository'} onClose={onClose}>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined);
        }}
      >
        <div className="form-grid">
          <label>
            Name
            <input
              autoFocus
              required
              maxLength={120}
              value={values.name}
              onChange={set('name')}
              placeholder="org/repo"
            />
            {issues.name && <span className="field-error">{issues.name}</span>}
          </label>
          <label>
            Workspace
            <select
              value={values.workspaceId}
              onChange={set('workspaceId')}
              disabled={Boolean(repository)}
            >
              {app.activeWorkspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Provider
            <select value={values.provider} onChange={set('provider')}>
              {['github', 'gitlab', 'bitbucket', 'azure', 'other'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Owner / organisation
            <input maxLength={120} value={values.owner} onChange={set('owner')} />
          </label>
          <label>
            URL
            <input
              type="url"
              maxLength={2048}
              value={values.repositoryUrl}
              onChange={set('repositoryUrl')}
              placeholder="https://"
            />
            {issues.repositoryUrl && <span className="field-error">{issues.repositoryUrl}</span>}
          </label>
          <label>
            Default branch
            <input maxLength={120} value={values.defaultBranch} onChange={set('defaultBranch')} />
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={2}
            maxLength={1000}
            value={values.description}
            onChange={set('description')}
          />
        </label>
        {save.error && !Object.keys(issues).length && <ErrorNote error={save.error} />}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
