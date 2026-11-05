'use client';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, GitBranch, Link2, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation, useRepositories } from '@/lib/api/queries';
import type { TaskDetail, TaskSummary } from '@/lib/api/types';
import { formatIsoDate } from '@/lib/dates';
import { useApp } from './context';
import { ErrorNote } from './shared';

const referenceLabels: Record<string, string> = {
  jira: 'Jira',
  pull_request: 'Pull request',
  commit: 'Commit',
  issue: 'Issue',
  documentation: 'Docs',
  other: 'Link',
};

export function TaskDrawerDevelopment({ task }: { task: TaskDetail }) {
  const app = useApp();
  const archived = Boolean(task.archivedAt);
  return (
    <>
      <DependenciesSection task={task} archived={archived} />
      <RepositoriesSection task={task} archived={archived} />
      <ReferencesSection task={task} archived={archived} />
      <DeliveriesSection task={task} archived={archived} />
      {app.workspaceById(task.workspaceId)?.kind === 'personal' && null}
    </>
  );
}

function DependenciesSection({ task, archived }: { task: TaskDetail; archived: boolean }) {
  const app = useApp();
  const [query, setQuery] = useState('');
  const search = useQuery<{ tasks: TaskSummary[] }>({
    queryKey: ['search', query.trim()],
    queryFn: () => api.get('/search', { q: query.trim() }),
    enabled: query.trim().length > 1,
  });
  const add = useApiMutation(
    (dependsOnTaskId: string) => api.post(`/tasks/${task.id}/dependencies`, { dependsOnTaskId }),
    'tasks',
    {
      onSuccess: () => setQuery(''),
    },
  );
  const remove = useApiMutation(
    (dependsOnTaskId: string) => api.delete(`/tasks/${task.id}/dependencies/${dependsOnTaskId}`),
    'tasks',
  );
  const candidates = (search.data?.tasks ?? []).filter(
    (candidate) =>
      candidate.id !== task.id &&
      candidate.workspaceId === task.workspaceId &&
      !task.dependencies.dependsOn.some((d) => d.taskId === candidate.id),
  );
  return (
    <section className="drawer-section">
      <div className="drawer-section-head">
        <h3>Dependencies</h3>
      </div>
      {task.dependencies.dependsOn.length === 0 && task.dependencies.blocks.length === 0 && (
        <p className="detail-hint">Nothing is waiting on this task, and it waits on nothing.</p>
      )}
      {task.dependencies.dependsOn.map((dependency) => (
        <div className="subtask-row" key={dependency.taskId}>
          <span className={`status-pill ${dependency.completed ? 'done' : ''}`}>
            {dependency.completed ? 'Done' : 'Waits on'}
          </span>
          <button className="text-link" onClick={() => app.openTask(dependency.taskId)}>
            {dependency.reference} {dependency.title}
          </button>
          <small>{dependency.statusName}</small>
          {!archived && (
            <button
              className="row-open"
              aria-label="Remove dependency"
              onClick={() => remove.mutate(dependency.taskId)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      {task.dependencies.blocks.map((dependency) => (
        <div className="subtask-row" key={`blocks-${dependency.taskId}`}>
          <span className="status-pill">Blocks</span>
          <button className="text-link" onClick={() => app.openTask(dependency.taskId)}>
            {dependency.reference} {dependency.title}
          </button>
          <small>{dependency.statusName}</small>
        </div>
      ))}
      {!archived && (
        <div className="inline-form column">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a task this one waits on…"
            aria-label="Search tasks to depend on"
          />
          {candidates.length > 0 && (
            <div className="search-results compact">
              {candidates.slice(0, 5).map((candidate) => (
                <button key={candidate.id} type="button" onClick={() => add.mutate(candidate.id)}>
                  <div>
                    <strong>
                      {candidate.reference} {candidate.title}
                    </strong>
                    <span>{candidate.status.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <ErrorNote error={add.error ?? remove.error} />
    </section>
  );
}

function RepositoriesSection({ task, archived }: { task: TaskDetail; archived: boolean }) {
  const app = useApp();
  const repositories = useRepositories({ workspaceId: task.workspaceId });
  const [open, setOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [codebaseName, setCodebaseName] = useState('');
  const [notes, setNotes] = useState('');
  const add = useApiMutation(
    (input: Record<string, unknown>) => api.post(`/tasks/${task.id}/repositories`, input),
    ['tasks', 'repositories'],
    {
      onSuccess: () => {
        setOpen(false);
        setBranchName('');
        setCodebaseName('');
        setNotes('');
        app.toast('Repository linked');
      },
    },
  );
  const update = useApiMutation(
    (input: { linkId: string; workStatus: string }) =>
      api.patch(`/tasks/${task.id}/repositories/${input.linkId}`, { workStatus: input.workStatus }),
    ['tasks', 'repositories'],
  );
  const remove = useApiMutation(
    (linkId: string) => api.delete(`/tasks/${task.id}/repositories/${linkId}`),
    ['tasks', 'repositories'],
  );
  const options = (repositories.data ?? []).filter((repo) => !repo.archivedAt);
  return (
    <section className="drawer-section">
      <div className="drawer-section-head">
        <h3>Repositories and branches</h3>
        {!archived && (
          <button className="text-link" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Link repository'}
          </button>
        )}
      </div>
      {open && (
        <form
          className="task-form compact"
          onSubmit={(event) => {
            event.preventDefault();
            if (!repositoryId) return;
            add.mutate({
              repositoryId,
              branchName: branchName || null,
              codebaseName: codebaseName || null,
              notes,
              workStatus: 'in_progress',
            });
          }}
        >
          {options.length === 0 ? (
            <p className="detail-hint">
              No repositories in this workspace yet. Add one on the Development page.
            </p>
          ) : (
            <div className="form-grid">
              <label>
                Repository
                <select
                  value={repositoryId}
                  onChange={(event) => setRepositoryId(event.target.value)}
                  required
                >
                  <option value="">Choose…</option>
                  {options.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Branch
                <input
                  value={branchName}
                  maxLength={200}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="feature/…"
                />
              </label>
              <label>
                Codebase / module
                <input
                  value={codebaseName}
                  maxLength={120}
                  onChange={(event) => setCodebaseName(event.target.value)}
                  placeholder="web, api, …"
                />
              </label>
              <label>
                Notes
                <input
                  value={notes}
                  maxLength={2000}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
          )}
          {options.length > 0 && (
            <div className="form-actions">
              <Button type="submit" size="sm" disabled={add.isPending}>
                Link
              </Button>
            </div>
          )}
        </form>
      )}
      {task.repositories.length === 0 && !open && (
        <p className="detail-hint">No repository linked yet.</p>
      )}
      {task.repositories.map((link) => (
        <div className="subtask-row" key={link.id}>
          <GitBranch size={14} />
          <span className="session-label">
            {link.repositoryName}
            {link.codebaseName ? ` · ${link.codebaseName}` : ''}
            <small>{link.branchName ?? 'No branch yet'}</small>
          </span>
          <select
            aria-label="Branch status"
            value={link.workStatus}
            disabled={archived}
            onChange={(event) => update.mutate({ linkId: link.id, workStatus: event.target.value })}
          >
            {['planned', 'in_progress', 'in_review', 'merged', 'abandoned'].map((value) => (
              <option key={value} value={value}>
                {value.replace('_', ' ')}
              </option>
            ))}
          </select>
          {!archived && (
            <button
              className="row-open"
              aria-label="Unlink repository"
              onClick={() => remove.mutate(link.id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      <ErrorNote error={add.error ?? update.error ?? remove.error} />
    </section>
  );
}

function ReferencesSection({ task, archived }: { task: TaskDetail; archived: boolean }) {
  const [open, setOpen] = useState(false);
  const [referenceType, setReferenceType] = useState('jira');
  const [referenceId, setReferenceId] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const add = useApiMutation(
    (input: Record<string, unknown>) => api.post(`/tasks/${task.id}/references`, input),
    'tasks',
    {
      onSuccess: () => {
        setOpen(false);
        setReferenceId('');
        setUrl('');
        setTitle('');
      },
    },
  );
  const remove = useApiMutation(
    (referenceId: string) => api.delete(`/tasks/${task.id}/references/${referenceId}`),
    'tasks',
  );
  return (
    <section className="drawer-section">
      <div className="drawer-section-head">
        <h3>References</h3>
        {!archived && (
          <button className="text-link" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Add reference'}
          </button>
        )}
      </div>
      {open && (
        <form
          className="task-form compact"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate({
              referenceType,
              referenceId: referenceId || null,
              url: url || null,
              title: title || null,
            });
          }}
        >
          <div className="form-grid">
            <label>
              Type
              <select
                value={referenceType}
                onChange={(event) => setReferenceType(event.target.value)}
              >
                {Object.entries(referenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Identifier
              <input
                value={referenceId}
                maxLength={120}
                onChange={(event) => setReferenceId(event.target.value)}
                placeholder="PROJ-123, #42, a1b2c3…"
              />
            </label>
            <label>
              URL
              <input
                type="url"
                value={url}
                maxLength={2048}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
              />
            </label>
            <label>
              Title
              <input
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <Button type="submit" size="sm" disabled={add.isPending}>
              Add
            </Button>
          </div>
        </form>
      )}
      {task.references.length === 0 && !open && (
        <p className="detail-hint">Link Jira tickets, pull requests, commits or documentation.</p>
      )}
      {task.references.map((reference) => (
        <div className="subtask-row" key={reference.id}>
          <Link2 size={14} />
          <span className="session-label">
            {reference.url ? (
              <a href={reference.url} target="_blank" rel="noopener noreferrer nofollow">
                {reference.title || reference.referenceId || reference.url}{' '}
                <ExternalLink size={11} />
              </a>
            ) : (
              reference.title || reference.referenceId
            )}
            <small>
              {referenceLabels[reference.referenceType] ?? reference.referenceType}
              {reference.referenceId && reference.title ? ` · ${reference.referenceId}` : ''}
            </small>
          </span>
          {!archived && (
            <button
              className="row-open"
              aria-label="Remove reference"
              onClick={() => remove.mutate(reference.id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      <ErrorNote error={add.error ?? remove.error} />
    </section>
  );
}

function DeliveriesSection({ task, archived }: { task: TaskDetail; archived: boolean }) {
  const app = useApp();
  const repositories = useRepositories({ workspaceId: task.workspaceId });
  const [open, setOpen] = useState(false);
  const [deliveryType, setDeliveryType] = useState('merged');
  const [environment, setEnvironment] = useState('development');
  const [deliveryStatus, setDeliveryStatus] = useState('successful');
  const [repositoryId, setRepositoryId] = useState('');
  const [version, setVersion] = useState('');
  const [branchName, setBranchName] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const add = useApiMutation(
    (input: Record<string, unknown>) => api.post(`/tasks/${task.id}/deliveries`, input),
    ['tasks', 'deliveries'],
    {
      onSuccess: () => {
        setOpen(false);
        setVersion('');
        setNotes('');
        app.toast('Delivery recorded');
      },
    },
  );
  const remove = useApiMutation(
    (deliveryId: string) => api.delete(`/tasks/${task.id}/deliveries/${deliveryId}`),
    ['tasks', 'deliveries'],
  );
  return (
    <section className="drawer-section">
      <div className="drawer-section-head">
        <h3>Deliveries</h3>
        {!archived && (
          <button className="text-link" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Record delivery'}
          </button>
        )}
      </div>
      {open && (
        <form
          className="task-form compact"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate({
              deliveryType,
              environment,
              deliveryStatus,
              repositoryId: repositoryId || null,
              version: version || null,
              branchName: branchName || null,
              referenceUrl: referenceUrl || null,
              notes,
            });
          }}
        >
          <div className="form-grid">
            <label>
              Event
              <select
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
              >
                <option value="merged">Merged</option>
                <option value="deployed">Deployed</option>
                <option value="verified">Production verified</option>
              </select>
            </label>
            <label>
              Environment
              <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                {['development', 'staging', 'uat', 'production', 'other'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Outcome
              <select
                value={deliveryStatus}
                onChange={(event) => setDeliveryStatus(event.target.value)}
              >
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label>
              Repository
              <select
                value={repositoryId}
                onChange={(event) => setRepositoryId(event.target.value)}
              >
                <option value="">None</option>
                {(repositories.data ?? []).map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Version
              <input
                value={version}
                maxLength={60}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="v1.2.0"
              />
            </label>
            <label>
              Branch
              <input
                value={branchName}
                maxLength={200}
                onChange={(event) => setBranchName(event.target.value)}
              />
            </label>
            <label>
              Link
              <input
                type="url"
                value={referenceUrl}
                maxLength={2048}
                onChange={(event) => setReferenceUrl(event.target.value)}
                placeholder="PR or deployment URL"
              />
            </label>
            <label>
              Notes
              <input
                value={notes}
                maxLength={2000}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <Button type="submit" size="sm" disabled={add.isPending}>
              Record
            </Button>
          </div>
        </form>
      )}
      {task.deliveries.length === 0 && !open && (
        <p className="detail-hint">
          Completing a task, merging, deploying and verifying production are separate events. Record
          each one.
        </p>
      )}
      {task.deliveries.map((delivery) => (
        <div className="subtask-row" key={delivery.id}>
          <ShieldCheck size={14} />
          <span className="session-label">
            {delivery.deliveryType === 'verified'
              ? 'Verified'
              : delivery.deliveryType === 'deployed'
                ? 'Deployed'
                : 'Merged'}{' '}
            · {delivery.environment}
            {delivery.version ? ` · ${delivery.version}` : ''}
            <small>
              {formatIsoDate(String(delivery.deliveredAt).slice(0, 10))}
              {delivery.repositoryName ? ` · ${delivery.repositoryName}` : ''}
              {delivery.notes ? ` · ${delivery.notes}` : ''}
            </small>
          </span>
          <span className={`status-pill ${delivery.deliveryStatus}`}>
            {delivery.deliveryStatus}
          </span>
          {!archived && (
            <button
              className="row-open"
              aria-label="Remove delivery record"
              onClick={() => remove.mutate(delivery.id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      <ErrorNote error={add.error ?? remove.error} />
    </section>
  );
}
