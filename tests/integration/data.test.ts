import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { tasks, workspaces } from '../../src/server/db/schema';
import { ConflictError } from '../../src/server/http/errors';
import { exportUserData } from '../../src/server/modules/data/export';
import { importLegacy } from '../../src/server/modules/data/legacy-import';
import { restoreUserData } from '../../src/server/modules/data/restore';
import { recordDelivery } from '../../src/server/modules/development/service';
import {
  changeTaskPhase,
  changeTaskStatus,
  createTask,
  getTaskDetail,
  listTasks,
  planTask,
} from '../../src/server/modules/tasks/service';
import { createTimeEntry, startTimer } from '../../src/server/modules/time/service';
import { getWorkspaceConfiguration } from '../../src/server/modules/workspaces/service';
import { createTestUser, createTestWorkspace, testDb } from './helpers';

import type { ListTasksQuery } from '../../src/lib/validation/tasks';

const listAll: ListTasksQuery = {
  limit: 200,
  offset: 0,
  sort: 'number',
  order: 'asc',
  completed: undefined,
  includeArchived: undefined,
  topLevelOnly: undefined,
};

describe('export and restore', () => {
  it('round-trips an account into another account with fresh ids and preserved history', async () => {
    const alice = await createTestUser('Alice');
    const office = await createTestWorkspace(alice.id, 'Office');
    const config = await getWorkspaceConfiguration(testDb(), alice.id, office.id);
    const parent = await createTask(testDb(), alice.id, {
      workspaceId: office.id,
      title: 'Parent',
      description: '',
      priority: 'high',
      plannedDate: '2026-11-03',
    });
    const child = await createTask(testDb(), alice.id, {
      workspaceId: office.id,
      title: 'Child',
      description: '',
      priority: 'low',
      parentTaskId: parent.id,
    });
    await planTask(testDb(), alice.id, parent.id, {
      plannedDate: '2026-11-04',
      reason: 'carryover',
    });
    await changeTaskPhase(testDb(), alice.id, parent.id, { phaseId: config.phases[2]!.id });
    await changeTaskStatus(testDb(), alice.id, parent.id, {
      statusId: config.statuses.find((s) => s.key === 'completed')!.id,
    });
    await createTimeEntry(
      testDb(),
      alice.id,
      {
        taskId: parent.id,
        workDate: '2026-11-04',
        durationMinutes: 45,
        description: '',
        allowOverlap: false,
      },
      'UTC',
    );
    await recordDelivery(testDb(), alice.id, parent.id, {
      deliveryType: 'deployed',
      environment: 'production',
      deliveryStatus: 'successful',
      notes: '',
    });
    await startTimer(testDb(), alice.id, { taskId: child.id });

    const archive = await exportUserData(testDb(), alice.id);
    expect(archive.data.tasks).toHaveLength(2);
    expect(JSON.stringify(archive)).not.toContain('"userId"');

    const bob = await createTestUser('Bob');
    await createTestWorkspace(bob.id, 'Office');
    const summary = await restoreUserData(testDb(), bob.id, JSON.parse(JSON.stringify(archive)));
    expect(summary.tasks).toBe(2);

    const { items } = await listTasks(testDb(), bob.id, listAll);
    expect(items.map((t) => t.title).sort()).toEqual(['Child', 'Parent']);
    expect(items.every((t) => t.id !== parent.id && t.id !== child.id)).toBe(true);
    const restoredParent = items.find((t) => t.title === 'Parent')!;
    const restoredChild = items.find((t) => t.title === 'Child')!;
    expect(restoredChild.parentTaskId).toBe(restoredParent.id);
    const detail = await getTaskDetail(testDb(), bob.id, restoredParent.id);
    expect(detail.statusHistory.map((h) => h.newStatusName)).toContain('Completed');
    expect(detail.plans.map((p) => p.reason).sort()).toEqual(['carryover', 'initial']);
    expect(detail.deliveries).toHaveLength(1);
    expect(detail.trackedSeconds).toBe(45 * 60);

    const bobWorkspaces = await testDb()
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, bob.id));
    expect(bobWorkspaces.map((w) => w.name).sort()).toEqual(['Office', 'Office (imported)']);
    // Alice's data is untouched.
    expect((await listTasks(testDb(), alice.id, listAll)).items).toHaveLength(2);
    await expect(restoreUserData(testDb(), bob.id, archive)).rejects.toBeInstanceOf(ConflictError);
  });

  it('rolls back completely when any record is invalid', async () => {
    const alice = await createTestUser('Alice');
    const office = await createTestWorkspace(alice.id);
    await createTask(testDb(), alice.id, {
      workspaceId: office.id,
      title: 'Valid',
      description: '',
      priority: 'low',
    });
    const archive = await exportUserData(testDb(), alice.id);
    (archive.data.tasks![0] as Record<string, unknown>).priority = 'urgent';
    const bob = await createTestUser('Bob');
    await expect(restoreUserData(testDb(), bob.id, archive)).rejects.toThrow(
      /could not be restored/,
    );
    expect(
      await testDb().select().from(workspaces).where(eq(workspaces.userId, bob.id)),
    ).toHaveLength(0);
    expect(await testDb().select().from(tasks).where(eq(tasks.userId, bob.id))).toHaveLength(0);
  });
});

describe('browser-local prototype import', () => {
  const state = {
    version: 1,
    projects: [
      { id: 'p1', name: 'Side project', workspace: 'Personal', description: '', archived: false },
    ],
    tasks: [
      {
        id: 'DM-104',
        title: 'Build the workspace switcher',
        description: '',
        workspace: 'Office',
        project: 'Daymark platform',
        status: 'active',
        priority: 'High',
        phase: 'Development',
        estimate: 120,
        date: '2026-11-05',
      },
      {
        id: 'DM-9F3A21',
        title: 'Fix the bike',
        description: 'Rear brake',
        workspace: 'Personal',
        project: 'Side project',
        status: 'done',
        priority: 'Medium',
        phase: 'Verification',
        estimate: 45,
        date: '2026-11-04',
      },
    ],
    sessions: [
      { id: 's1', taskId: 'DM-9F3A21', seconds: 1800, endedAt: Date.parse('2026-11-04T18:00:00Z') },
    ],
    activities: [
      {
        id: 'a1',
        title: 'Fixed the bike',
        detail: 'Personal',
        time: Date.parse('2026-11-04T18:00:00Z'),
        workspace: 'Personal',
        taskId: 'DM-9F3A21',
      },
    ],
    timer: null,
    journal: 'A good day.',
    goals: [false, false, false, false],
  };

  it('imports real records, skips fictional samples by default and refuses duplicates', async () => {
    const user = await createTestUser();
    const summary = await importLegacy(testDb(), user.id, state, {
      includeSample: false,
      timezone: 'UTC',
    });
    expect(summary).toMatchObject({ tasks: 1, sessions: 1, activities: 1, journal: 1 });
    const { items } = await listTasks(testDb(), user.id, listAll);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Fix the bike',
      projectName: 'Side project',
      plannedDate: '2026-11-04',
    });
    expect(items[0]!.status.countsAsCompleted).toBe(true);
    const detail = await getTaskDetail(testDb(), user.id, items[0]!.id);
    expect(detail.trackedSeconds).toBe(1800);
    await expect(
      importLegacy(testDb(), user.id, state, { includeSample: false, timezone: 'UTC' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('includes sample tasks only when asked', async () => {
    const user = await createTestUser();
    await importLegacy(testDb(), user.id, state, { includeSample: true, timezone: 'UTC' });
    const { items } = await listTasks(testDb(), user.id, listAll);
    expect(items.map((t) => t.title).sort()).toEqual([
      'Build the workspace switcher',
      'Fix the bike',
    ]);
  });
});
