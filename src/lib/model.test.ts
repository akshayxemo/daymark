import { describe, expect, it } from 'vitest';
import {
  archiveProjectState,
  elapsed,
  formatDuration,
  localDate,
  makeInitialState,
  projectsForState,
  renameProject,
} from './model';
describe('persisted focus timer', () => {
  it('counts elapsed time from a persisted timestamp after reopening', () => {
    const timer = JSON.parse(JSON.stringify({ taskId: 'task', accumulated: 90, startedAt: 1000 }));
    expect(elapsed(timer, 121000)).toBe(210);
  });
  it('excludes paused time', () => {
    expect(elapsed({ taskId: 'task', accumulated: 120, startedAt: null }, 900000)).toBe(120);
  });
  it('resumes from accumulated active time', () => {
    expect(elapsed({ taskId: 'task', accumulated: 120, startedAt: 600000 }, 630000)).toBe(150);
  });
  it('does not subtract time when a device clock moves backwards', () => {
    expect(elapsed({ taskId: 'task', accumulated: 120, startedAt: 600000 }, 599000)).toBe(120);
  });
  it('handles empty sessions and durations over an hour', () => {
    expect(elapsed(null, 123)).toBe(0);
    expect(formatDuration(3723)).toBe('01:02:03');
  });
  it('uses a calendar date in the local timezone', () => {
    expect(localDate(new Date(2026, 10, 3, 1, 30))).toBe('2026-11-03');
  });
});

describe('project migration and renaming', () => {
  it('preserves projects independently when different workspaces use the same name', () => {
    const state = makeInitialState();
    state.tasks.push({ ...state.tasks[0], id: 'other', workspace: 'Personal' });
    const projects = projectsForState(state).filter((p) => p.name === 'Daymark platform');
    expect(projects.map((p) => p.workspace)).toEqual(['Office', 'Personal']);
    const renamed = renameProject(state, projects[0].id, 'New name', 'Updated');
    expect(renamed.tasks.find((t) => t.id === 'DM-104')?.project).toBe('New name');
    expect(renamed.tasks.find((t) => t.id === 'other')?.project).toBe('Daymark platform');
    expect(renamed.activities).toEqual(state.activities);
    expect(renamed.sessions).toEqual(state.sessions);
    expect(state.tasks[0].project).toBe('Daymark platform');
  });
  it('retains empty and archived projects independently of tasks', () => {
    const state = makeInitialState();
    state.projects = [
      { id: 'empty', name: 'Empty', workspace: 'Office', description: '', archived: true },
    ];
    expect(projectsForState(state)).toEqual(state.projects);
  });
  it('archives and restores a project without removing tasks, sessions or activity', () => {
    const state = makeInitialState();
    const id = projectsForState(state)[0].id;
    const archived = archiveProjectState(state, id, true);
    expect(projectsForState(archived).find((p) => p.id === id)?.archived).toBe(true);
    expect(archived.tasks).toEqual(state.tasks);
    expect(archived.sessions).toEqual(state.sessions);
    expect(archived.activities).toEqual(state.activities);
    expect(
      projectsForState(archiveProjectState(archived, id, false)).find((p) => p.id === id)?.archived,
    ).toBe(false);
  });
});
