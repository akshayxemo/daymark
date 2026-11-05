import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordDelivery } from '../../src/server/modules/development/service';
import { createProject, listProjects } from '../../src/server/modules/projects/service';
import { overviewMetrics, reportMetrics } from '../../src/server/modules/analytics/service';
import { changeTaskStatus, createTask } from '../../src/server/modules/tasks/service';
import { createTimeEntry } from '../../src/server/modules/time/service';
import { getWorkspaceConfiguration } from '../../src/server/modules/workspaces/service';
import { createRepository, listRepositories } from '../../src/server/modules/development/service';
import { createTestUser, createTestWorkspace, testDb } from './helpers';

describe('analytics from real records', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('counts only successful deliveries, computes estimate ratios and per-project totals', async () => {
    const user = await createTestUser();
    const office = await createTestWorkspace(user.id);
    const config = await getWorkspaceConfiguration(testDb(), user.id, office.id);
    const completed = config.statuses.find((s) => s.key === 'completed')!;
    const project = await createProject(testDb(), user.id, {
      workspaceId: office.id,
      name: 'Platform',
      description: '',
      status: 'active',
    });
    const repo = await createRepository(testDb(), user.id, {
      workspaceId: office.id,
      name: 'org/app',
      provider: 'github',
      repositoryUrl: '',
      description: '',
    });

    const shipped = await createTask(testDb(), user.id, {
      workspaceId: office.id,
      title: 'Shipped',
      description: '',
      priority: 'high',
      projectId: project.id,
      estimatedMinutes: 60,
      plannedDate: '2026-11-05',
    });
    const failed = await createTask(testDb(), user.id, {
      workspaceId: office.id,
      title: 'Failed deploy',
      description: '',
      priority: 'low',
      estimatedMinutes: 30,
    });
    await createTimeEntry(
      testDb(),
      user.id,
      {
        taskId: shipped.id,
        workDate: '2026-11-05',
        durationMinutes: 90,
        description: '',
        allowOverlap: false,
      },
      'UTC',
    );
    await changeTaskStatus(testDb(), user.id, shipped.id, { statusId: completed.id });
    await changeTaskStatus(testDb(), user.id, failed.id, { statusId: completed.id });
    await recordDelivery(testDb(), user.id, shipped.id, {
      repositoryId: repo.id,
      deliveryType: 'verified',
      environment: 'production',
      deliveryStatus: 'successful',
      notes: '',
    });
    await recordDelivery(testDb(), user.id, failed.id, {
      deliveryType: 'deployed',
      environment: 'production',
      deliveryStatus: 'failed',
      notes: '',
    });

    const report = await reportMetrics(testDb(), user.id, {
      from: '2026-11-01',
      to: '2026-11-30',
      timezone: 'UTC',
    });
    expect(report.completion.completed).toBe(2);
    expect(report.deliveries.eligibleTasks).toBe(2);
    expect(report.deliveries.deliveredTasks).toBe(1);
    expect(report.deliveries.verificationRate).toBe(50);
    expect(
      report.deliveries.successfulByEnvironment.find((r) => r.environment === 'production'),
    ).toMatchObject({ verified: 1, deployed: 0, failed: 1 });
    expect(report.estimation.tasks).toEqual([
      expect.objectContaining({
        title: 'Shipped',
        estimatedMinutes: 60,
        actualMinutes: 90,
        ratio: 1.5,
      }),
    ]);
    expect(report.time.byProject.find((r) => r.projectName === 'Platform')).toMatchObject({
      seconds: 5400,
      completed: 1,
    });
    expect(report.time.byProject.find((r) => r.projectName === 'No project')).toMatchObject({
      seconds: 0,
      completed: 1,
    });

    const overview = await overviewMetrics(testDb(), user.id, {
      from: '2026-11-02',
      to: '2026-11-08',
      timezone: 'UTC',
      today: '2026-11-05',
      weekStartsOn: 1,
    });
    expect(overview.plannedToday).toMatchObject({ total: 1, completed: 1 });
    expect(overview.tracked.totalSeconds).toBe(5400);
    expect(overview.deliveries).toEqual({
      productionVerified: 1,
      productionDeployed: 0,
      merged: 0,
    });

    const [projectRow] = await listProjects(testDb(), user.id);
    expect(projectRow).toMatchObject({ taskCount: 1, completedCount: 1 });
    const [repoRow] = await listRepositories(testDb(), user.id);
    expect(repoRow).toMatchObject({ deliveryCount: 1 });
  });
});
