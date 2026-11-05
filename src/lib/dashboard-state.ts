import { elapsed, statuses, phases, workspaces, type State, type Task } from './model';
export function stopInState(state: State): State {
  if (!state.timer) return state;
  const task = state.tasks.find((t) => t.id === state.timer!.taskId);
  const seconds = elapsed(state.timer, Date.now());
  return {
    ...state,
    timer: null,
    sessions: seconds
      ? [
          ...state.sessions,
          { id: crypto.randomUUID(), taskId: state.timer.taskId, seconds, endedAt: Date.now() },
        ]
      : state.sessions,
    activities: [
      {
        id: crypto.randomUUID(),
        taskId: state.timer.taskId,
        title: `Focus session saved · ${Math.floor(seconds / 60)}m ${seconds % 60}s`,
        detail: task?.title || 'Focus session',
        workspace: task?.workspace || 'Office',
        time: Date.now(),
      },
      ...state.activities,
    ],
  };
}
export function validState(data: unknown): data is State {
  if (!data || typeof data !== 'object') return false;
  const s = data as State;
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (
    s.version !== 1 ||
    !Array.isArray(s.tasks) ||
    !Array.isArray(s.sessions) ||
    !Array.isArray(s.activities) ||
    !Array.isArray(s.goals) ||
    s.goals.length !== 4 ||
    !s.goals.every((v) => typeof v === 'boolean') ||
    typeof s.journal !== 'string' ||
    !['dark', 'light'].includes(s.theme) ||
    !['All workspaces', ...workspaces].includes(s.workspace) ||
    !Array.isArray(s.hidden) ||
    !s.hidden.every((v) => typeof v === 'string')
  )
    return false;
  if (
    !s.tasks.every(
      (t) =>
        t &&
        ['id', 'title', 'description', 'project', 'phase', 'date'].every(
          (k) => typeof t[k as keyof Task] === 'string',
        ) &&
        workspaces.includes(t.workspace) &&
        statuses.some((x) => x.id === t.status) &&
        ['High', 'Medium', 'Low'].includes(t.priority) &&
        phases.includes(t.phase) &&
        finite(t.estimate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date),
    )
  )
    return false;
  if (s.projects !== undefined) {
    if (
      !Array.isArray(s.projects) ||
      !s.projects.every(
        (p) =>
          p &&
          typeof p.id === 'string' &&
          p.id.length > 0 &&
          typeof p.name === 'string' &&
          p.name.trim().length > 0 &&
          typeof p.description === 'string' &&
          typeof p.archived === 'boolean' &&
          workspaces.includes(p.workspace),
      )
    )
      return false;
    if (
      new Set(s.projects.map((p) => p.id)).size !== s.projects.length ||
      new Set(s.projects.map((p) => JSON.stringify([p.workspace, p.name]))).size !==
        s.projects.length
    )
      return false;
    if (
      s.tasks.some(
        (t) =>
          t.project.trim() &&
          !s.projects!.some((p) => p.workspace === t.workspace && p.name === t.project),
      )
    )
      return false;
  }
  const ids = new Set(s.tasks.map((t) => t.id));
  if (ids.size !== s.tasks.length) return false;
  if (
    !s.sessions.every(
      (x) =>
        x &&
        typeof x.id === 'string' &&
        ids.has(x.taskId) &&
        finite(x.seconds) &&
        finite(x.endedAt),
    )
  )
    return false;
  if (
    !s.activities.every(
      (x) =>
        x &&
        ['id', 'title', 'detail'].every((k) => typeof x[k as keyof typeof x] === 'string') &&
        workspaces.includes(x.workspace) &&
        finite(x.time) &&
        (!x.taskId || ids.has(x.taskId)),
    )
  )
    return false;
  return (
    s.timer === null ||
    (!!s.timer &&
      ids.has(s.timer.taskId) &&
      finite(s.timer.accumulated) &&
      (s.timer.startedAt === null || finite(s.timer.startedAt)))
  );
}
