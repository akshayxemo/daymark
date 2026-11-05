'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation } from '@/lib/api/queries';
import type { PhaseRow, StatusRow, TagRow, TaskTypeRow, WorkspaceView } from '@/lib/api/types';
import { useApp } from '../context';
import { ErrorNote, Modal, SectionHead, WorkspaceTag } from '../shared';
import { SettingsNav } from './settings';

const icons = ['briefcase', 'leaf', 'book', 'code', 'heart', 'home', 'star', 'target', 'globe'];
const colors = ['accent', 'purple', 'orange', 'muted'];
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkspacesSettingsPage() {
  const app = useApp();
  const [selected, setSelected] = useState(app.workspaceId ?? app.activeWorkspaces[0]?.id ?? '');
  const [editor, setEditor] = useState<WorkspaceView | 'new' | null>(null);
  const archive = useApiMutation(
    (input: { id: string; archived: boolean }) =>
      api.post(`/workspaces/${input.id}/${input.archived ? 'archive' : 'restore'}`),
    'workspaces',
    {
      onSuccess: (_, input) =>
        app.toast(input.archived ? 'Workspace archived. History was kept.' : 'Workspace restored'),
    },
  );
  const workspace = app.workspaces.find((w) => w.id === selected);
  return (
    <div className="page-stack">
      <SettingsNav />
      <section className="card">
        <SectionHead
          title="Workspaces"
          subtitle="Each workspace keeps its own projects, statuses, phases and history. Archiving hides a workspace without deleting anything."
          action={
            <Button size="sm" onClick={() => setEditor('new')}>
              <Plus size={14} />
              New workspace
            </Button>
          }
        />
        <div className="config-table-wrap">
          <table className="config-table">
            <thead>
              <tr>
                <th scope="col">Workspace</th>
                <th scope="col">Open tasks</th>
                <th scope="col">State</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {app.workspaces.map((w) => (
                <tr key={w.id}>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => setSelected(w.id)}
                      aria-pressed={selected === w.id}
                    >
                      <WorkspaceTag workspaceId={w.id} />
                    </button>
                    {w.isDefault && <small className="muted"> · default</small>}
                  </td>
                  <td>{w.openTasks}</td>
                  <td>{w.archivedAt ? 'Archived' : 'Active'}</td>
                  <td>
                    <div className="inline-form">
                      <Button size="sm" variant="ghost" onClick={() => setEditor(w)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archive.mutate({ id: w.id, archived: !w.archivedAt })}
                      >
                        {w.archivedAt ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ErrorNote error={archive.error} />
      </section>
      {workspace && <WorkspaceConfig workspace={workspace} key={workspace.id} />}
      {editor && (
        <WorkspaceEditor
          workspace={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function WorkspaceEditor({
  workspace,
  onClose,
}: {
  workspace: WorkspaceView | null;
  onClose: () => void;
}) {
  const app = useApp();
  const [name, setName] = useState(workspace?.name ?? '');
  const [description, setDescription] = useState(workspace?.description ?? '');
  const [kind, setKind] = useState(workspace?.kind ?? 'custom');
  const [icon, setIcon] = useState(workspace?.icon ?? 'briefcase');
  const [color, setColor] = useState(workspace?.color ?? 'accent');
  const save = useApiMutation(
    () =>
      workspace
        ? api.patch(`/workspaces/${workspace.id}`, { name, description, icon, color })
        : api.post('/workspaces', { name, description, kind, icon, color }),
    'workspaces',
    {
      onSuccess: () => {
        app.toast(
          workspace ? 'Workspace updated' : 'Workspace created with default statuses and phases',
        );
        onClose();
      },
    },
  );
  const issues = save.error instanceof ApiError ? save.error.issues : {};
  return (
    <Modal title={workspace ? 'Edit workspace' : 'New workspace'} onClose={onClose}>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined);
        }}
      >
        <label>
          Name
          <input
            autoFocus
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {issues.name && <span className="field-error">{issues.name}</span>}
        </label>
        <div className="form-grid">
          {!workspace && (
            <label>
              Kind (sets default configuration)
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="personal">Personal</option>
                <option value="learning">Learning</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          )}
          <label>
            Icon
            <select value={icon} onChange={(e) => setIcon(e.target.value)}>
              {icons.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {colors.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={2}
            maxLength={500}
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
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WorkspaceConfig({ workspace }: { workspace: WorkspaceView }) {
  const app = useApp();
  const statuses = app.configuration.statuses.filter((s) => s.workspaceId === workspace.id);
  const types = app.configuration.taskTypes.filter((t) => t.workspaceId === workspace.id);
  const phases = app.configuration.phases.filter((p) => p.workspaceId === workspace.id);
  const tags = app.configuration.tags.filter((t) => t.workspaceId === workspace.id);
  return (
    <>
      <WorkingHours workspace={workspace} />
      <StatusTable workspaceId={workspace.id} statuses={statuses} />
      <SimpleList
        title="Task types"
        subtitle="Used to group work and to scope phases."
        workspaceId={workspace.id}
        resource="task-types"
        rows={types}
        flagLabel="Default"
        flagKey="isDefault"
      />
      <SimpleList
        title="Phases"
        subtitle="Stages of execution. Separate from status; every change is recorded."
        workspaceId={workspace.id}
        resource="phases"
        rows={phases}
        types={types}
      />
      <SimpleList
        title="Tags"
        subtitle="Label tasks and journal entries."
        workspaceId={workspace.id}
        resource="tags"
        rows={tags}
      />
    </>
  );
}

function WorkingHours({ workspace }: { workspace: WorkspaceView }) {
  const [loaded, setLoaded] = useState<{
    workingDays: number[];
    workingMinutesPerDay: number;
    timezone: string | null;
  } | null>(null);
  const [error, setError] = useState<unknown>(null);
  if (!loaded && !error) {
    api
      .get<{ workingDays: number[]; workingMinutesPerDay: number; timezone: string | null }>(
        `/workspaces/${workspace.id}/settings`,
      )
      .then(setLoaded)
      .catch(setError);
  }
  const save = useApiMutation(
    (input: Record<string, unknown>) =>
      api.patch<NonNullable<typeof loaded>>(`/workspaces/${workspace.id}/settings`, input),
    'workspaces',
    { onSuccess: (data) => setLoaded(data) },
  );
  return (
    <section className="card">
      <SectionHead
        title={`${workspace.name} · working days and hours`}
        subtitle="Used for workload estimates. Leave the timezone empty to inherit your account timezone."
      />
      <ErrorNote error={error ?? save.error} />
      {loaded && (
        <div className="task-form">
          <div className="pill-list" role="group" aria-label="Working days">
            {days.map((day, index) => {
              const on = loaded.workingDays.includes(index);
              return (
                <button
                  type="button"
                  key={day}
                  className={`pill ${on ? 'active' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    save.mutate({
                      workingDays: on
                        ? loaded.workingDays.filter((d) => d !== index)
                        : [...loaded.workingDays, index],
                    })
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="form-grid">
            <label>
              Working hours per day
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                defaultValue={loaded.workingMinutesPerDay / 60}
                onBlur={(e) =>
                  save.mutate({ workingMinutesPerDay: Math.round(Number(e.target.value) * 60) })
                }
              />
            </label>
            <label>
              Timezone override
              <input
                defaultValue={loaded.timezone ?? ''}
                placeholder="Inherit account timezone"
                maxLength={64}
                onBlur={(e) => save.mutate({ timezone: e.target.value.trim() || null })}
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}

const statusFlags: { key: keyof StatusRow; label: string }[] = [
  { key: 'isInitial', label: 'Initial' },
  { key: 'isActive', label: 'Active' },
  { key: 'isTerminal', label: 'Terminal' },
  { key: 'countsAsCompleted', label: 'Completed' },
  { key: 'stopsTimer', label: 'Stops timer' },
];

function StatusTable({ workspaceId, statuses }: { workspaceId: string; statuses: StatusRow[] }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('not_started');
  const create = useApiMutation(
    () => api.post(`/workspaces/${workspaceId}/statuses`, { name, category }),
    'workspaces',
    { onSuccess: () => setName('') },
  );
  const update = useApiMutation(
    (input: { id: string; changes: Record<string, unknown> }) =>
      api.patch(`/workspaces/${workspaceId}/statuses/${input.id}`, input.changes),
    'workspaces',
  );
  const archive = useApiMutation(
    (id: string) => api.delete(`/workspaces/${workspaceId}/statuses/${id}`),
    'workspaces',
  );
  return (
    <section className="card">
      <SectionHead
        title="Statuses"
        subtitle="Behaviour comes from these flags, never from the names. Archiving is blocked while tasks still use a status."
      />
      <div className="config-table-wrap">
        <table className="config-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              {statusFlags.map((f) => (
                <th scope="col" key={f.key}>
                  {f.label}
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => (
              <tr key={status.id}>
                <td>
                  <input
                    type="text"
                    defaultValue={status.name}
                    aria-label={`Name of ${status.name}`}
                    onBlur={(e) =>
                      e.target.value.trim() &&
                      e.target.value !== status.name &&
                      update.mutate({ id: status.id, changes: { name: e.target.value.trim() } })
                    }
                  />
                </td>
                <td>
                  <select
                    value={status.category}
                    aria-label={`Category of ${status.name}`}
                    onChange={(e) =>
                      update.mutate({ id: status.id, changes: { category: e.target.value } })
                    }
                  >
                    {['not_started', 'active', 'paused', 'waiting', 'done', 'closed'].map((c) => (
                      <option key={c} value={c}>
                        {c.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                {statusFlags.map((flag) => (
                  <td key={flag.key}>
                    <input
                      type="checkbox"
                      checked={Boolean(status[flag.key])}
                      aria-label={`${flag.label}: ${status.name}`}
                      onChange={(e) =>
                        update.mutate({ id: status.id, changes: { [flag.key]: e.target.checked } })
                      }
                    />
                  </td>
                ))}
                <td>
                  <Button size="sm" variant="ghost" onClick={() => archive.mutate(status.id)}>
                    Archive
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate(undefined);
        }}
      >
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="New status name"
          aria-label="New status name"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="New status category"
        >
          {['not_started', 'active', 'paused', 'waiting', 'done', 'closed'].map((c) => (
            <option key={c} value={c}>
              {c.replace('_', ' ')}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Add status
        </Button>
      </form>
      <ErrorNote error={create.error ?? update.error ?? archive.error} />
    </section>
  );
}

type Row = TaskTypeRow | PhaseRow | TagRow;

function SimpleList({
  title,
  subtitle,
  workspaceId,
  resource,
  rows,
  flagLabel,
  flagKey,
  types,
}: {
  title: string;
  subtitle: string;
  workspaceId: string;
  resource: 'task-types' | 'phases' | 'tags';
  rows: Row[];
  flagLabel?: string;
  flagKey?: 'isDefault';
  types?: TaskTypeRow[];
}) {
  const [name, setName] = useState('');
  const create = useApiMutation(
    () => api.post(`/workspaces/${workspaceId}/${resource}`, { name }),
    'workspaces',
    {
      onSuccess: () => setName(''),
    },
  );
  const update = useApiMutation(
    (input: { id: string; changes: Record<string, unknown> }) =>
      api.patch(`/workspaces/${workspaceId}/${resource}/${input.id}`, input.changes),
    'workspaces',
  );
  const remove = useApiMutation(
    (id: string) => api.delete(`/workspaces/${workspaceId}/${resource}/${id}`),
    'workspaces',
  );
  return (
    <section className="card">
      <SectionHead title={title} subtitle={subtitle} />
      <div className="config-table-wrap">
        <table className="config-table">
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    type="text"
                    defaultValue={row.name}
                    aria-label={`Rename ${row.name}`}
                    onBlur={(e) =>
                      e.target.value.trim() &&
                      e.target.value !== row.name &&
                      update.mutate({ id: row.id, changes: { name: e.target.value.trim() } })
                    }
                  />
                </td>
                {flagKey && 'isDefault' in row && (
                  <td>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={row.isDefault}
                        onChange={(e) =>
                          update.mutate({ id: row.id, changes: { isDefault: e.target.checked } })
                        }
                      />
                      {flagLabel}
                    </label>
                  </td>
                )}
                {types && 'taskTypeId' in row && (
                  <td>
                    <select
                      value={row.taskTypeId ?? ''}
                      aria-label={`Task type for ${row.name}`}
                      onChange={(e) =>
                        update.mutate({
                          id: row.id,
                          changes: { taskTypeId: e.target.value || null },
                        })
                      }
                    >
                      <option value="">All task types</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(row.id)}>
                    {resource === 'tags' ? 'Delete' : 'Archive'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate(undefined);
        }}
      >
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder={`New ${title.toLowerCase().replace(/s$/, '')}`}
          aria-label={`New ${title}`}
        />
        <Button type="submit" size="sm" variant="outline">
          Add
        </Button>
      </form>
      <ErrorNote error={create.error ?? update.error ?? remove.error} />
    </section>
  );
}
