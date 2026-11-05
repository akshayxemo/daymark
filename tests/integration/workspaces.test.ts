import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { taskStatuses } from '../../src/server/db/schema';
import { NotFoundError } from '../../src/server/http/errors';
import {
  createWorkspace,
  ensureWorkspaceDefaults,
  getWorkspace,
  getWorkspaceConfiguration,
  listWorkspaces,
  setWorkspaceArchived,
} from '../../src/server/modules/workspaces/service';
import { createTestUser, createTestWorkspace, testDb } from './helpers';

describe('workspaces', () => {
  it('creates default statuses, task types and phases for a new workspace', async () => {
    const owner = await createTestUser();
    const workspace = await createTestWorkspace(owner.id, 'Office', 'professional');
    const config = await getWorkspaceConfiguration(testDb(), owner.id, workspace.id);
    expect(config.statuses.map((s) => s.name)).toEqual([
      'Backlog',
      'Planned',
      'In Progress',
      'On Hold',
      'Blocked',
      'Completed',
      'Cancelled',
    ]);
    expect(config.statuses.filter((s) => s.isInitial)).toHaveLength(1);
    expect(config.statuses.find((s) => s.name === 'Completed')).toMatchObject({
      countsAsCompleted: true,
      isTerminal: true,
      stopsTimer: true,
    });
    expect(config.taskTypes.find((t) => t.isDefault)?.name).toBe('Development');
    expect(config.phases).toHaveLength(9);
    expect(workspace.isDefault).toBe(true);
  });

  it('applies simpler defaults to personal workspaces and is idempotent', async () => {
    const owner = await createTestUser();
    const workspace = await createTestWorkspace(owner.id, 'Personal', 'personal');
    const before = await getWorkspaceConfiguration(testDb(), owner.id, workspace.id);
    expect(before.phases.map((p) => p.name)).toEqual([
      'Planning',
      'In Progress',
      'Review',
      'Completed',
    ]);
    const created = await ensureWorkspaceDefaults(testDb(), workspace);
    expect(created).toEqual({ statuses: 0, taskTypes: 0, phases: 0 });
    const statuses = await testDb()
      .select()
      .from(taskStatuses)
      .where(eq(taskStatuses.workspaceId, workspace.id));
    expect(statuses).toHaveLength(7);
  });

  it('never reveals another user’s workspace', async () => {
    const alice = await createTestUser('Alice');
    const bob = await createTestUser('Bob');
    const workspace = await createTestWorkspace(alice.id);
    await expect(getWorkspace(testDb(), bob.id, workspace.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await listWorkspaces(testDb(), bob.id)).toEqual([]);
  });

  it('keeps at least one active workspace and preserves history on archive', async () => {
    const owner = await createTestUser();
    const office = await createTestWorkspace(owner.id, 'Office');
    await expect(setWorkspaceArchived(testDb(), owner.id, office.id, true)).rejects.toThrow(
      /at least one/,
    );
    await createWorkspace(testDb(), owner.id, {
      name: 'Personal',
      description: '',
      kind: 'personal',
      icon: 'leaf',
      color: 'purple',
    });
    const archived = await setWorkspaceArchived(testDb(), owner.id, office.id, true);
    expect(archived.archivedAt).not.toBeNull();
    const config = await getWorkspaceConfiguration(testDb(), owner.id, office.id);
    expect(config.statuses).toHaveLength(7);
    expect((await listWorkspaces(testDb(), owner.id)).map((w) => w.name)).toEqual(['Personal']);
  });
});
