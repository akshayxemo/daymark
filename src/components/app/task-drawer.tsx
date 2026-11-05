'use client';
import { Archive, ArchiveRestore, Clock3, Copy, FolderKanban, Play } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation, useProjects, useTask } from '@/lib/api/queries';
import type { TaskDetail, TaskSummary } from '@/lib/api/types';
import { formatIsoDate, hoursLabel } from '@/lib/dates';
import { useApp, useStatusHelpers } from './context';
import { Markdown } from './markdown';
import { ErrorNote, LoadingRows, Modal, PriorityPill, WorkspaceTag } from './shared';
import { TaskDrawerDevelopment } from './task-drawer-dev';
import { TaskDrawerHistory } from './task-drawer-history';
import { TaskDrawerTime } from './task-drawer-time';
import { useTimerActions } from './timer-actions';

export function TaskDrawer({ taskId }: { taskId: string }) {
  const app = useApp();
  const task = useTask(taskId);
  const close = () => app.openTask(null);
  return (
    <Modal title="Task details" drawer wide onClose={close}>
      {task.isLoading && <LoadingRows rows={6} />}
      {task.error && <ErrorNote error={task.error} />}
      {task.data && <TaskBody task={task.data} />}
    </Modal>
  );
}

function TaskBody({ task }: { task: TaskDetail }) {
  const app = useApp();
  const helpers = useStatusHelpers();
  const timer = useTimerActions();
  const projects = useProjects({ workspaceId: task.workspaceId, includeArchived: true });
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(task.description);
  const [newSubtask, setNewSubtask] = useState('');

  const update = useApiMutation(
    (input: Record<string, unknown>) => api.patch<TaskSummary>(`/tasks/${task.id}`, input),
    'tasks',
  );
  const status = useApiMutation(
    (statusId: string) => api.post<TaskSummary>(`/tasks/${task.id}/status`, { statusId }),
    'tasks',
  );
  const phase = useApiMutation(
    (phaseId: string | null) => api.post<TaskSummary>(`/tasks/${task.id}/phase`, { phaseId }),
    'tasks',
  );
  const plan = useApiMutation(
    (plannedDate: string | null) =>
      api.post<TaskSummary>(`/tasks/${task.id}/plan`, { plannedDate }),
    'tasks',
  );
  const archive = useApiMutation(
    (archived: boolean) =>
      api.post<TaskSummary>(`/tasks/${task.id}/${archived ? 'archive' : 'restore'}`),
    'tasks',
    {
      onSuccess: (_, archived) =>
        app.toast(archived ? 'Task archived. History was kept.' : 'Task restored'),
    },
  );
  const duplicate = useApiMutation(
    () => api.post<TaskSummary>(`/tasks/${task.id}/duplicate`),
    'tasks',
    {
      onSuccess: (copy) => {
        app.toast(`Duplicated as ${copy.reference}`);
        app.openTask(copy.id);
      },
    },
  );
  const addSubtask = useApiMutation(
    (subtaskTitle: string) =>
      api.post<TaskSummary>('/tasks', {
        workspaceId: task.workspaceId,
        parentTaskId: task.id,
        projectId: task.projectId,
        title: subtaskTitle,
        priority: task.priority,
      }),
    'tasks',
    { onSuccess: () => setNewSubtask('') },
  );
  const subtaskStatus = useApiMutation(
    (input: { id: string; statusId: string }) =>
      api.post<TaskSummary>(`/tasks/${input.id}/status`, { statusId: input.statusId }),
    'tasks',
  );

  const statuses = helpers.statusesFor(task.workspaceId);
  const phases = helpers.phasesFor(task.workspaceId, task.taskTypeId);
  const types = helpers.typesFor(task.workspaceId);
  const tags = helpers.tagsFor(task.workspaceId);
  const archived = Boolean(task.archivedAt);
  const timerOnThis = timer.state?.active?.task.id === task.id;
  const firstError = [update, status, phase, plan, archive, duplicate, addSubtask]
    .map((m) => m.error)
    .find(Boolean);

  return (
    <div className="task-detail">
      <div className="detail-id">
        <span>{task.reference}</span>
        <WorkspaceTag workspaceId={task.workspaceId} />
        {archived && <span className="status-pill muted">Archived</span>}
        {task.parentTaskId && (
          <button className="text-link" onClick={() => app.openTask(task.parentTaskId)}>
            Part of a larger task
          </button>
        )}
      </div>
      {editingTitle ? (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim() && title.trim() !== task.title) update.mutate({ title: title.trim() });
            setEditingTitle(false);
          }}
        >
          <input
            autoFocus
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Task title"
          />
          <Button type="submit" size="sm">
            Save
          </Button>
        </form>
      ) : (
        <h1>
          <button
            className="title-edit"
            title="Edit title"
            onClick={() => {
              if (archived) return;
              setTitle(task.title);
              setEditingTitle(true);
            }}
          >
            {task.title}
          </button>
        </h1>
      )}
      <p className="detail-project">
        <FolderKanban size={14} />
        {task.projectName ?? 'No project'} · {task.taskTypeName}
        <PriorityPill priority={task.priority} />
      </p>

      <div className="detail-properties">
        <label>
          Project
          <select
            value={task.projectId ?? ''}
            disabled={archived}
            onChange={(event) => update.mutate({ projectId: event.target.value || null })}
          >
            <option value="">No project</option>
            {(projects.data ?? [])
              .filter((project) => !project.archivedAt || project.id === task.projectId)
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {project.archivedAt ? ' (archived)' : ''}
                </option>
              ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={task.statusId}
            disabled={archived}
            onChange={(event) => status.mutate(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Phase
          <select
            value={task.phaseId ?? ''}
            disabled={archived}
            onChange={(event) => phase.mutate(event.target.value || null)}
          >
            <option value="">No phase</option>
            {phases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            value={task.taskTypeId}
            disabled={archived}
            onChange={(event) => update.mutate({ taskTypeId: event.target.value })}
          >
            {types.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select
            value={task.priority}
            disabled={archived}
            onChange={(event) => update.mutate({ priority: event.target.value })}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Planned date
          <input
            type="date"
            value={task.plannedDate ?? ''}
            disabled={archived}
            onChange={(event) => plan.mutate(event.target.value || null)}
          />
        </label>
        <label>
          Due date
          <input
            type="date"
            value={task.dueDate ?? ''}
            disabled={archived}
            onChange={(event) => update.mutate({ dueDate: event.target.value || null })}
          />
        </label>
        <label>
          Estimate (minutes)
          <input
            type="number"
            min="0"
            max="100000"
            defaultValue={task.estimatedMinutes ?? ''}
            disabled={archived}
            onBlur={(event) => {
              const value = event.target.value === '' ? null : Number(event.target.value);
              if (value !== task.estimatedMinutes) update.mutate({ estimatedMinutes: value });
            }}
          />
        </label>
      </div>

      {tags.length > 0 && (
        <div className="pill-list" aria-label="Tags">
          {tags.map((tag) => {
            const active = task.tags.some((t) => t.id === tag.id);
            return (
              <button
                key={tag.id}
                className={`pill ${active ? 'active' : ''}`}
                aria-pressed={active}
                disabled={archived}
                onClick={() =>
                  update.mutate({
                    tagIds: active
                      ? task.tags.filter((t) => t.id !== tag.id).map((t) => t.id)
                      : [...task.tags.map((t) => t.id), tag.id],
                  })
                }
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      )}

      <h3>Description</h3>
      {editingDescription ? (
        <form
          className="task-form"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate({ description });
            setEditingDescription(false);
          }}
        >
          <textarea
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-label="Description (Markdown)"
          />
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingDescription(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save description
            </Button>
          </div>
        </form>
      ) : (
        <div className="detail-description">
          {task.description ? (
            <Markdown content={task.description} />
          ) : (
            <p className="muted">A blank page for a new beginning.</p>
          )}
          {!archived && (
            <button
              className="text-link"
              onClick={() => {
                setDescription(task.description);
                setEditingDescription(true);
              }}
            >
              Edit description
            </button>
          )}
        </div>
      )}

      <div className="detail-estimate">
        <Clock3 size={15} />
        {task.estimatedMinutes ?? 0} minutes estimated<span>·</span>
        {hoursLabel(task.trackedSeconds)} tracked
      </div>
      {!archived && (
        <Button onClick={() => timer.start(task.id)} disabled={timerOnThis || timer.busy}>
          <Play size={14} />
          {timerOnThis
            ? 'Session already active'
            : timer.state?.active
              ? 'Save current & focus on this'
              : 'Focus on this task'}
        </Button>
      )}
      <ErrorNote error={firstError} />

      <h3>Subtasks</h3>
      {task.subtasks.length === 0 && (
        <p className="detail-hint">Break the work down into smaller steps.</p>
      )}
      {task.subtasks.map((subtask) => {
        const done = subtask.status.countsAsCompleted;
        const target = done
          ? helpers.reopenStatus(task.workspaceId)
          : helpers.completedStatus(task.workspaceId);
        return (
          <div className="subtask-row" key={subtask.id}>
            <button
              className={`task-check ${done ? 'checked' : ''}`}
              aria-label={`${done ? 'Reopen' : 'Complete'} ${subtask.title}`}
              disabled={!target}
              onClick={() =>
                target && subtaskStatus.mutate({ id: subtask.id, statusId: target.id })
              }
            >
              {done && '✓'}
            </button>
            <button className="text-link" onClick={() => app.openTask(subtask.id)}>
              {subtask.title}
            </button>
            <small>{subtask.status.name}</small>
          </div>
        );
      })}
      {!archived && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (newSubtask.trim()) addSubtask.mutate(newSubtask.trim());
          }}
        >
          <input
            value={newSubtask}
            maxLength={200}
            placeholder="Add a subtask"
            aria-label="New subtask"
            onChange={(event) => setNewSubtask(event.target.value)}
          />
          <Button type="submit" size="sm" variant="outline" disabled={addSubtask.isPending}>
            Add
          </Button>
        </form>
      )}

      <TaskDrawerTime task={task} />
      <TaskDrawerDevelopment task={task} />
      <TaskDrawerHistory task={task} />

      <div className="form-actions detail-footer">
        <span className="muted">
          Created {formatIsoDate(task.createdAt.slice(0, 10), { year: true })}
          {task.completedAt
            ? ` · Completed ${formatIsoDate(task.completedAt.slice(0, 10), { year: true })}`
            : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => duplicate.mutate(undefined)}
          disabled={duplicate.isPending}
        >
          <Copy size={13} />
          Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => archive.mutate(!archived)}
          disabled={archive.isPending}
        >
          {archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
          {archived ? 'Restore' : 'Archive'}
        </Button>
      </div>
      {firstError instanceof ApiError && firstError.status === 409 && (
        <p className="detail-hint">{firstError.message}</p>
      )}
    </div>
  );
}
