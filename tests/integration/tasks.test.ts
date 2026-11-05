import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { activityEvents, taskPlans, taskStatusHistory, tasks } from '../../src/server/db/schema';
import { ConflictError, NotFoundError, ValidationError } from '../../src/server/http/errors';
import { createProject } from '../../src/server/modules/projects/service';
import {
  addDependency,
  carryOverTasks,
  changeTaskPhase,
  changeTaskStatus,
  createTask,
  getTaskDetail,
  getTaskSummary,
  listTasks,
  planTask,
  updateTask,
} from '../../src/server/modules/tasks/service';
import { getWorkspaceConfiguration } from '../../src/server/modules/workspaces/service';
import { createTestUser, createTestWorkspace, testDb } from './helpers';

async function setup() {
  const owner = await createTestUser();
  const workspace = await createTestWorkspace(owner.id);
  const config = await getWorkspaceConfiguration(testDb(), owner.id, workspace.id);
  const status = (key: string) => config.statuses.find((s) => s.key === key)!;
  return { owner, workspace, config, status };
}

describe('task lifecycle', () => {
  it('creates a task with readable numbers, initial history and a plan record', async () => {
    const { owner, workspace } = await setup();
    const first = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'Build the workspace switcher',
      description: '',
      priority: 'high',
      estimatedMinutes: 120,
      plannedDate: '2026-11-05',
    });
    const second = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'Backlog idea',
      description: '',
      priority: 'low',
    });
    expect(first.reference).toBe('DM-1');
    expect(second.reference).toBe('DM-2');
    expect(first.status.name).toBe('Planned');
    expect(second.status.name).toBe('Backlog');
    const history = await testDb()
      .select()
      .from(taskStatusHistory)
      .where(eq(taskStatusHistory.taskId, first.id));
    expect(history).toHaveLength(1);
    expect(history[0]!.previousStatusId).toBeNull();
    const plans = await testDb().select().from(taskPlans).where(eq(taskPlans.taskId, first.id));
    expect(plans).toEqual([
      expect.objectContaining({
        plannedDate: '2026-11-05',
        reason: 'initial',
        plannedMinutes: 120,
      }),
    ]);
  });

  it('records status and phase transitions transactionally with activity events', async () => {
    const { owner, workspace, config, status } = await setup();
    const task = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'Ship it',
      description: '',
      priority: 'medium',
    });
    const inProgress = await changeTaskStatus(testDb(), owner.id, task.id, {
      statusId: status('in_progress').id,
    });
    expect(inProgress.status.isActive).toBe(true);
    const completed = await changeTaskStatus(testDb(), owner.id, task.id, {
      statusId: status('completed').id,
      reason: 'Done',
    });
    expect(completed.completedAt).not.toBeNull();
    const review = config.phases.find((p) => p.name === 'Code Review')!;
    await changeTaskPhase(testDb(), owner.id, task.id, { phaseId: review.id });
    const development = config.phases.find((p) => p.name === 'Development')!;
    await changeTaskPhase(testDb(), owner.id, task.id, {
      phaseId: development.id,
      notes: 'Back for fixes',
    });

    const detail = await getTaskDetail(testDb(), owner.id, task.id);
    expect(detail.statusHistory.map((h) => h.newStatusName)).toEqual([
      'Completed',
      'In Progress',
      'Backlog',
    ]);
    expect(detail.statusHistory[0]!.reason).toBe('Done');
    expect(detail.phaseHistory.map((h) => h.newPhaseName)).toEqual(['Development', 'Code Review']);
    expect(detail.phaseHistory[0]!.previousPhaseName).toBe('Code Review');
    const events = await testDb()
      .select({ type: activityEvents.eventType })
      .from(activityEvents)
      .where(and(eq(activityEvents.userId, owner.id), eq(activityEvents.taskId, task.id)));
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining([
        'task.created',
        'task.status_changed',
        'task.completed',
        'task.phase_changed',
      ]),
    );

    const reopened = await changeTaskStatus(testDb(), owner.id, task.id, {
      statusId: status('planned').id,
    });
    expect(reopened.completedAt).toBeNull();
  });

  it('keeps the original plan when a task is moved or carried over', async () => {
    const { owner, workspace } = await setup();
    const task = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'Write the report',
      description: '',
      priority: 'medium',
      plannedDate: '2026-11-03',
    });
    await planTask(testDb(), owner.id, task.id, { plannedDate: '2026-11-04' });
    const result = await carryOverTasks(testDb(), owner.id, {
      fromDate: '2026-11-04',
      toDate: '2026-11-05',
    });
    expect(result.moved).toBe(1);
    const plans = await testDb()
      .select()
      .from(taskPlans)
      .where(eq(taskPlans.taskId, task.id))
      .orderBy(taskPlans.createdAt);
    expect(plans.map((p) => [p.plannedDate, p.previousPlannedDate, p.reason])).toEqual([
      ['2026-11-03', null, 'initial'],
      ['2026-11-04', '2026-11-03', 'moved'],
      ['2026-11-05', '2026-11-04', 'carryover'],
    ]);
    const summary = await getTaskSummary(testDb(), owner.id, task.id);
    expect(summary.plannedDate).toBe('2026-11-05');
    const events = await testDb()
      .select({ type: activityEvents.eventType })
      .from(activityEvents)
      .where(eq(activityEvents.taskId, task.id));
    expect(events.map((e) => e.type)).toContain('task.carried_over');
  });

  it('rejects references to another user’s project and hides their tasks', async () => {
    const alice = await setup();
    const bob = await setup();
    const bobProject = await createProject(testDb(), bob.owner.id, {
      workspaceId: bob.workspace.id,
      name: 'Secret',
      description: '',
      status: 'active',
    });
    await expect(
      createTask(testDb(), alice.owner.id, {
        workspaceId: alice.workspace.id,
        title: 'Sneaky',
        description: '',
        priority: 'low',
        projectId: bobProject.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    // Even a raw insert that bypasses the service is rejected by the composite foreign key.
    const config = alice.config;
    await expect(
      testDb().insert(tasks).values({
        userId: alice.owner.id,
        workspaceId: alice.workspace.id,
        projectId: bobProject.id,
        taskTypeId: config.taskTypes[0]!.id,
        statusId: config.statuses[0]!.id,
        taskNumber: 999,
        title: 'Raw',
      }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });

    const bobTask = await createTask(testDb(), bob.owner.id, {
      workspaceId: bob.workspace.id,
      title: 'Private',
      description: '',
      priority: 'low',
    });
    await expect(getTaskSummary(testDb(), alice.owner.id, bobTask.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      updateTask(testDb(), alice.owner.id, bobTask.id, { title: 'Hijacked' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    const { items } = await listTasks(testDb(), alice.owner.id, {
      limit: 50,
      offset: 0,
      sort: 'updated',
      order: 'desc',
    } as never);
    expect(items.map((t) => t.id)).not.toContain(bobTask.id);
  });

  it('prevents dependency cycles and self-dependencies', async () => {
    const { owner, workspace } = await setup();
    const a = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'A',
      description: '',
      priority: 'low',
    });
    const b = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'B',
      description: '',
      priority: 'low',
    });
    const c = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'C',
      description: '',
      priority: 'low',
    });
    await addDependency(testDb(), owner.id, a.id, b.id);
    await addDependency(testDb(), owner.id, b.id, c.id);
    await expect(addDependency(testDb(), owner.id, c.id, a.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(addDependency(testDb(), owner.id, a.id, a.id)).rejects.toBeInstanceOf(
      ValidationError,
    );
    const detail = await getTaskDetail(testDb(), owner.id, a.id);
    expect(detail.dependencies.dependsOn.map((d) => d.title)).toEqual(['B']);
  });
});
