export type Workspace = 'Office' | 'Personal' | 'Learning';
export const workspaces: Workspace[] = ['Office', 'Personal', 'Learning'];
export const statuses = [
  { id: 'planned', name: 'Planned', completed: false, stopsTimer: false },
  { id: 'active', name: 'In progress', completed: false, stopsTimer: false },
  { id: 'blocked', name: 'Blocked', completed: false, stopsTimer: true },
  { id: 'done', name: 'Completed', completed: true, stopsTimer: true },
];
export const phases = [
  'Planning',
  'Development',
  'Code review',
  'QA / Testing',
  'Deployment',
  'Verification',
];
export type Task = {
  id: string;
  title: string;
  description: string;
  workspace: Workspace;
  project: string;
  status: string;
  priority: 'High' | 'Medium' | 'Low';
  phase: string;
  estimate: number;
  date: string;
};
export type Activity = {
  id: string;
  title: string;
  detail: string;
  time: number;
  workspace: Workspace;
  taskId?: string;
};
export type Timer = { taskId: string; accumulated: number; startedAt: number | null };
export type Project = {
  id: string;
  name: string;
  workspace: Workspace;
  description: string;
  archived: boolean;
};
export type Session = { id: string; taskId: string; seconds: number; endedAt: number };
export type State = {
  version: 1;
  projects?: Project[];
  tasks: Task[];
  activities: Activity[];
  timer: Timer | null;
  sessions: Session[];
  journal: string;
  goals: boolean[];
  theme: 'dark' | 'light';
  hidden: string[];
  workspace: 'All workspaces' | Workspace;
};
// Older exports only store a project name on each task. Preserve workspace boundaries
// when converting those names to independently manageable projects.
export function projectsForState(state: State): Project[] {
  if (state.projects) return state.projects;
  const seen = new Set<string>();
  return state.tasks.flatMap((task) => {
    if (!task.project.trim()) return [];
    const key = JSON.stringify([task.workspace, task.project]);
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      { id: key, name: task.project, workspace: task.workspace, description: '', archived: false },
    ];
  });
}
export function renameProject(state: State, id: string, name: string, description: string): State {
  const projects = projectsForState(state);
  const project = projects.find((p) => p.id === id);
  if (!project) return state;
  return {
    ...state,
    projects: projects.map((p) => (p.id === id ? { ...p, name, description } : p)),
    tasks: state.tasks.map((t) =>
      t.workspace === project.workspace && t.project === project.name ? { ...t, project: name } : t,
    ),
  };
}
export function archiveProjectState(state: State, id: string, archived: boolean): State {
  return {
    ...state,
    projects: projectsForState(state).map((p) => (p.id === id ? { ...p, archived } : p)),
  };
}
export function elapsed(timer: Timer | null, now: number) {
  return timer
    ? timer.accumulated +
        (timer.startedAt === null ? 0 : Math.max(0, Math.floor((now - timer.startedAt) / 1000)))
    : 0;
}
export function formatDuration(seconds: number) {
  const s = Math.floor(Math.max(0, seconds));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function isCompleted(task: Task) {
  return statuses.find((s) => s.id === task.status)?.completed ?? false;
}
export function makeInitialState(): State {
  const date = localDate();
  const now = Date.now();
  const tasks: Task[] = [
    {
      id: 'DM-104',
      title: 'Build the workspace switcher',
      description:
        'Create a unified workspace switcher with clear scope, keyboard access, and saved preferences.',
      workspace: 'Office',
      project: 'Daymark platform',
      status: 'active',
      priority: 'High',
      phase: 'Development',
      estimate: 120,
      date,
    },
    {
      id: 'DM-108',
      title: 'Review authentication flow',
      description:
        'Review the initial sign-up and sign-in experience. Capture edge cases for first-time setup.',
      workspace: 'Office',
      project: 'Daymark platform',
      status: 'planned',
      priority: 'High',
      phase: 'Code review',
      estimate: 45,
      date,
    },
    {
      id: 'DM-112',
      title: 'Read a chapter of Designing Data-Intensive Applications',
      description:
        'Focus on data models and query languages. Write down three practical takeaways.',
      workspace: 'Learning',
      project: 'Engineering bookshelf',
      status: 'planned',
      priority: 'Medium',
      phase: 'Planning',
      estimate: 30,
      date,
    },
    {
      id: 'DM-115',
      title: 'Plan meals for the week',
      description: 'Make a simple meal plan and grocery list for the next seven days.',
      workspace: 'Personal',
      project: 'Life admin',
      status: 'planned',
      priority: 'Low',
      phase: 'Planning',
      estimate: 20,
      date,
    },
    {
      id: 'DM-101',
      title: 'Set up the project foundation',
      description: 'Initialize the repository and define the initial architecture.',
      workspace: 'Office',
      project: 'Daymark platform',
      status: 'done',
      priority: 'High',
      phase: 'Verification',
      estimate: 90,
      date,
    },
    {
      id: 'DM-102',
      title: 'Morning mobility & stretch',
      description: 'Take twenty minutes to move before starting the workday.',
      workspace: 'Personal',
      project: 'Personal wellbeing',
      status: 'done',
      priority: 'Medium',
      phase: 'Verification',
      estimate: 20,
      date,
    },
  ];
  return {
    version: 1,
    tasks,
    timer: null,
    sessions: [
      { id: 's1', taskId: 'DM-101', seconds: 5700, endedAt: now - 7200000 },
      { id: 's2', taskId: 'DM-104', seconds: 4200, endedAt: now - 3600000 },
      { id: 's3', taskId: 'DM-102', seconds: 1200, endedAt: now - 18000000 },
      { id: 's4', taskId: 'DM-112', seconds: 1800, endedAt: now - 14400000 },
      ...Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i - 1);
        d.setHours(17, 0, 0, 0);
        return {
          id: `historical-${i}`,
          taskId: ['DM-101', 'DM-104', 'DM-112', 'DM-102', 'DM-104', 'DM-101'][i],
          seconds: [16200, 7200, 5400, 3600, 12600, 18000][i],
          endedAt: d.getTime(),
        };
      }),
    ],
    activities: [
      {
        id: 'a1',
        title: 'Started building the workspace switcher',
        detail: 'Development · Daymark platform',
        time: now - 600000,
        workspace: 'Office',
        taskId: 'DM-104',
      },
      {
        id: 'a2',
        title: 'Project foundation completed',
        detail: 'Task completed · Daymark platform',
        time: now - 3600000,
        workspace: 'Office',
        taskId: 'DM-101',
      },
      {
        id: 'a3',
        title: 'Production deployment verified',
        detail: 'Demo release v0.1.0 · Production',
        time: now - 7200000,
        workspace: 'Office',
      },
      {
        id: 'a4',
        title: 'Made time for a little movement',
        detail: '20 min tracked · Personal wellbeing',
        time: now - 18000000,
        workspace: 'Personal',
        taskId: 'DM-102',
      },
    ],
    journal: '',
    goals: [true, true, false, false],
    theme: 'dark',
    hidden: [],
    workspace: 'All workspaces',
  };
}
