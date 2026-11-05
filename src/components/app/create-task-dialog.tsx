'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation, useProjects } from '@/lib/api/queries';
import type { TaskSummary } from '@/lib/api/types';
import { createTaskSchema } from '@/lib/validation/tasks';
import { useApp, useStatusHelpers } from './context';
import { Modal } from './shared';

const formSchema = createTaskSchema
  .omit({
    estimatedMinutes: true,
    plannedDate: true,
    dueDate: true,
    projectId: true,
    taskTypeId: true,
    phaseId: true,
  })
  .extend({
    projectId: z.string().default(''),
    taskTypeId: z.string().default(''),
    estimatedMinutes: z.coerce.number().int().min(0).max(100000).default(30),
    plannedDate: z.string().default(''),
    dueDate: z.string().default(''),
  });
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

export function CreateTaskDialog() {
  const app = useApp();
  const helpers = useStatusHelpers();
  const defaults = app.createDefaults ?? {};
  const defaultWorkspace =
    defaults.workspaceId ?? app.workspaceId ?? app.activeWorkspaces[0]?.id ?? '';
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: defaultWorkspace,
      title: '',
      description: '',
      projectId: defaults.projectId ?? '',
      taskTypeId: '',
      priority: 'medium',
      estimatedMinutes: 30,
      plannedDate: defaults.plannedDate === undefined ? app.today : (defaults.plannedDate ?? ''),
      dueDate: '',
    },
  });
  const workspaceId = useWatch({ control: form.control, name: 'workspaceId' });
  const projects = useProjects({ workspaceId });
  const types = helpers.typesFor(workspaceId);
  const create = useApiMutation(
    (values: FormValues) =>
      api.post<TaskSummary>('/tasks', {
        workspaceId: values.workspaceId,
        title: values.title,
        description: values.description,
        projectId: values.projectId || null,
        taskTypeId: values.taskTypeId || undefined,
        priority: values.priority,
        estimatedMinutes: values.estimatedMinutes,
        plannedDate: values.plannedDate || null,
        dueDate: values.dueDate || null,
      }),
    'tasks',
    {
      onSuccess: (task) => {
        app.toast(`${task.reference} added to your plan`);
        app.closeCreate();
      },
    },
  );
  const error = create.error instanceof ApiError ? create.error : null;

  return (
    <Modal title="A new next step" onClose={app.closeCreate}>
      <form
        className="task-form"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
        noValidate
      >
        <p>Give it a name. You can figure out the rest along the way.</p>
        <label>
          Task name
          <input
            autoFocus
            maxLength={200}
            placeholder="What would you like to move forward?"
            {...form.register('title')}
          />
          {(form.formState.errors.title || error?.issues.title) && (
            <span className="field-error">
              {form.formState.errors.title?.message ?? error?.issues.title}
            </span>
          )}
        </label>
        <div className="form-grid">
          <label>
            Workspace
            <select {...form.register('workspaceId')}>
              {app.activeWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project
            <select {...form.register('projectId')}>
              <option value="">No project</option>
              {(projects.data ?? [])
                .filter((project) => !project.archivedAt)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Type
            <select {...form.register('taskTypeId')}>
              <option value="">Default</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select {...form.register('priority')}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            Estimate (minutes)
            <input type="number" min="0" max="100000" {...form.register('estimatedMinutes')} />
          </label>
          <label>
            Planned date
            <input type="date" {...form.register('plannedDate')} />
          </label>
          <label>
            Due date
            <input type="date" {...form.register('dueDate')} />
          </label>
        </div>
        <label>
          A little context
          <textarea
            rows={3}
            placeholder="Notes, ideas, or a useful starting point…"
            {...form.register('description')}
          />
        </label>
        {error && !Object.keys(error.issues).length && (
          <p className="project-error" role="alert">
            {error.message}
          </p>
        )}
        <div className="form-actions">
          <Button variant="ghost" type="button" onClick={app.closeCreate}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            <Plus size={15} />
            {create.isPending ? 'Creating…' : 'Create task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
