import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { workSessions } from '../../src/server/db/schema';
import { ConflictError } from '../../src/server/http/errors';
import {
  changeTaskStatus,
  createTask,
  getTaskDetail,
} from '../../src/server/modules/tasks/service';
import {
  createTimeEntry,
  dailyTotals,
  getTimerState,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
} from '../../src/server/modules/time/service';
import { getWorkspaceConfiguration } from '../../src/server/modules/workspaces/service';
import { createTestUser, createTestWorkspace, testDb } from './helpers';

async function setup() {
  const owner = await createTestUser();
  const workspace = await createTestWorkspace(owner.id);
  const config = await getWorkspaceConfiguration(testDb(), owner.id, workspace.id);
  const task = await createTask(testDb(), owner.id, {
    workspaceId: workspace.id,
    title: 'Focus work',
    description: '',
    priority: 'high',
  });
  return { owner, workspace, config, task };
}

describe('server-authoritative timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T09:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('excludes paused time and records the active duration on stop', async () => {
    const { owner, task } = await setup();
    const started = await startTimer(testDb(), owner.id, { taskId: task.id });
    expect(started.active?.status).toBe('running');
    expect(started.active?.elapsedSeconds).toBe(0);

    vi.setSystemTime(new Date('2026-11-05T09:01:00Z'));
    const paused = await pauseTimer(testDb(), owner.id);
    expect(paused.active?.status).toBe('paused');
    expect(paused.active?.elapsedSeconds).toBe(60);

    vi.setSystemTime(new Date('2026-11-05T09:10:00Z'));
    expect((await getTimerState(testDb(), owner.id)).active?.elapsedSeconds).toBe(60);

    await resumeTimer(testDb(), owner.id);
    vi.setSystemTime(new Date('2026-11-05T09:10:30Z'));
    const { session, state } = await stopTimer(testDb(), owner.id, {
      description: 'Morning block',
    });
    expect(session.durationSeconds).toBe(90);
    expect(session.status).toBe('completed');
    expect(state.active).toBeNull();

    const detail = await getTaskDetail(testDb(), owner.id, task.id);
    expect(detail.trackedSeconds).toBe(90);
    expect(detail.status.isActive).toBe(true);
  });

  it('never allows two active sessions, even for concurrent starts', async () => {
    const { owner, workspace, task } = await setup();
    const other = await createTask(testDb(), owner.id, {
      workspaceId: workspace.id,
      title: 'Second task',
      description: '',
      priority: 'low',
    });
    await Promise.all([
      startTimer(testDb(), owner.id, { taskId: task.id }),
      startTimer(testDb(), owner.id, { taskId: other.id }),
      startTimer(testDb(), owner.id, { taskId: task.id }),
    ]);
    const active = await testDb()
      .select()
      .from(workSessions)
      .where(eq(workSessions.userId, owner.id));
    expect(active.filter((s) => s.status === 'running' || s.status === 'paused')).toHaveLength(1);
  });

  it('stops the timer when the task enters a timer-stopping status', async () => {
    const { owner, task, config } = await setup();
    await startTimer(testDb(), owner.id, { taskId: task.id });
    vi.setSystemTime(new Date('2026-11-05T09:05:00Z'));
    const blocked = config.statuses.find((s) => s.key === 'blocked')!;
    await changeTaskStatus(testDb(), owner.id, task.id, { statusId: blocked.id });
    expect((await getTimerState(testDb(), owner.id)).active).toBeNull();
    const detail = await getTaskDetail(testDb(), owner.id, task.id);
    expect(detail.sessions[0]).toMatchObject({ durationSeconds: 300, status: 'completed' });
  });

  it('survives a reload: state is derived from persisted timestamps', async () => {
    const { owner, task } = await setup();
    await startTimer(testDb(), owner.id, { taskId: task.id });
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
    const state = await getTimerState(testDb(), owner.id);
    expect(state.active?.elapsedSeconds).toBe(3600);
    expect(state.active?.runningSince).toBe('2026-11-05T09:00:00.000Z');
  });

  it('rejects overlapping manual entries unless explicitly reconciled and aggregates totals', async () => {
    const { owner, task, workspace } = await setup();
    const entry = await createTimeEntry(
      testDb(),
      owner.id,
      {
        taskId: task.id,
        startedAt: '2026-11-04T08:00:00Z',
        endedAt: '2026-11-04T09:00:00Z',
        description: 'Planning',
        allowOverlap: false,
      },
      'UTC',
    );
    expect(entry.durationSeconds).toBe(3600);
    expect(entry.workDate).toBe('2026-11-04');
    await expect(
      createTimeEntry(
        testDb(),
        owner.id,
        {
          taskId: task.id,
          startedAt: '2026-11-04T08:30:00Z',
          endedAt: '2026-11-04T09:30:00Z',
          description: '',
          allowOverlap: false,
        },
        'UTC',
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    await createTimeEntry(
      testDb(),
      owner.id,
      {
        taskId: task.id,
        startedAt: '2026-11-04T08:30:00Z',
        endedAt: '2026-11-04T09:30:00Z',
        description: 'Reconciled',
        allowOverlap: true,
      },
      'UTC',
    );
    await createTimeEntry(
      testDb(),
      owner.id,
      {
        taskId: task.id,
        workDate: '2026-11-05',
        durationMinutes: 30,
        description: '',
        allowOverlap: false,
      },
      'UTC',
    );
    const totals = await dailyTotals(
      testDb(),
      owner.id,
      { from: '2026-11-01', to: '2026-11-30' },
      'UTC',
    );
    expect(totals).toEqual([
      { day: '2026-11-04', workspaceId: workspace.id, seconds: 7200, sessions: 0, manual: 2 },
      { day: '2026-11-05', workspaceId: workspace.id, seconds: 1800, sessions: 0, manual: 1 },
    ]);
  });
});
