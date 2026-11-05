'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { sectionFromPath, sectionPaths, type Section } from '@/lib/routes';
import {
  elapsed,
  isCompleted,
  localDate,
  makeInitialState,
  projectsForState,
  renameProject,
  archiveProjectState,
  statuses,
  type State,
  type Task,
  type Project,
  type Workspace,
} from '@/lib/model';
import { stopInState, validState } from '@/lib/dashboard-state';
const STORE = 'daymark.design.v1';

export function useDashboard() {
  const [state, setState] = useState<State | null>(null);
  const router = useRouter();
  const page = sectionFromPath(usePathname()) ?? 'Overview';
  const [period, setPeriod] = useState('This week');
  const [taskTab, setTaskTab] = useState('All tasks');
  const [selected, setSelected] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const [taskWorkspace, setTaskWorkspace] = useState<Workspace>('Office');
  const [projectEditor, setProjectEditor] = useState<Project | 'new' | null>(null);
  const [archiveProject, setArchiveProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customize, setCustomize] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [phoneWidth, setPhoneWidth] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => setPhoneWidth(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [plannerDate, setPlannerDate] = useState(localDate());
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (create)
      setTaskWorkspace(
        state?.workspace === 'All workspaces' ? 'Office' : state?.workspace || 'Office',
      );
  }, [create, state?.workspace]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      const saved = raw ? JSON.parse(raw) : null;
      setState(validState(saved) ? saved : makeInitialState());
    } catch {
      setState(makeInitialState());
      setStorageError('Browser storage is unavailable. Export your changes before leaving.');
    }
  }, []);
  useEffect(() => {
    if (!state) return;
    document.documentElement.dataset.theme = state.theme;
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {
      setStorageError('Your browser could not save changes. Export your data to keep a copy.');
    }
  }, [state]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  if (!state) return null;
  const today = localDate();
  const workspace = state.workspace;
  const projects = projectsForState(state);
  const scopedTasks = state.tasks.filter(
    (t) => workspace === 'All workspaces' || t.workspace === workspace,
  );
  const todayTasks = scopedTasks.filter((t) => t.date === today);
  const visibleTasks = (page === 'Tasks' ? scopedTasks : todayTasks).filter(
    (t) => taskTab === 'All tasks' || (taskTab === 'Completed' ? isCompleted(t) : !isCompleted(t)),
  );
  const scopedSessions = state.sessions.filter((s) => scopedTasks.some((t) => t.id === s.taskId));
  const startOfPeriod = new Date();
  startOfPeriod.setHours(0, 0, 0, 0);
  if (period === 'This week')
    startOfPeriod.setDate(startOfPeriod.getDate() - ((startOfPeriod.getDay() + 6) % 7));
  if (period === 'This month') startOfPeriod.setDate(1);
  const periodSessions = scopedSessions.filter((s) => s.endedAt >= startOfPeriod.getTime());
  const totalSeconds = periodSessions.reduce((n, s) => n + s.seconds, 0);
  const task = state.tasks.find((t) => t.id === selected);
  const timerTask = state.tasks.find((t) => t.id === state.timer?.taskId);
  const focusTask = timerTask || scopedTasks.find((t) => !isCompleted(t));
  const runningSeconds = elapsed(state.timer, now);
  const completed = todayTasks.filter(isCompleted).length;
  const completedPercent = todayTasks.length
    ? Math.round((completed / todayTasks.length) * 100)
    : 0;
  const events = state.activities.filter(
    (a) => workspace === 'All workspaces' || a.workspace === workspace,
  );
  const hoursLabel = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  const navigate = (name: string) => {
    const destination = sectionPaths[name as Section];
    if (destination) router.push(destination);
    setMobile(false);
    setTaskTab('All tasks');
  };
  function updateTask(id: string, changes: Partial<Task>) {
    setState((prev) => {
      if (!prev) return prev;
      const original = prev.tasks.find((t) => t.id === id);
      if (!original) return prev;
      const keys = Object.keys(changes) as (keyof Task)[];
      if (keys.every((k) => changes[k] === original[k])) return prev;
      let next = {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)),
        activities: [
          {
            id: crypto.randomUUID(),
            taskId: id,
            title: changes.status
              ? `${original.title} → ${statuses.find((s) => s.id === changes.status)?.name}`
              : changes.phase
                ? `Phase changed to ${changes.phase}`
                : changes.date
                  ? `Moved from ${original.date} to ${changes.date}`
                  : changes.project !== undefined
                    ? `Project changed from ${original.project || 'No project'} to ${changes.project || 'No project'}`
                    : 'Task details updated',
            detail: original.title,
            workspace: original.workspace,
            time: Date.now(),
          },
          ...prev.activities,
        ],
      };
      if (
        changes.status &&
        statuses.find((s) => s.id === changes.status)?.stopsTimer &&
        prev.timer?.taskId === id
      )
        next = stopInState(next);
      return next;
    });
  }
  function startTimer(t: Task) {
    setState((prev) => {
      if (!prev) return prev;
      let next = prev.timer ? stopInState(prev) : prev;
      return {
        ...next,
        timer: { taskId: t.id, accumulated: 0, startedAt: Date.now() },
        tasks: next.tasks.map((x) => (x.id === t.id ? { ...x, status: 'active' } : x)),
        activities: [
          {
            id: crypto.randomUUID(),
            taskId: t.id,
            title: 'Focus session started',
            detail: t.title,
            workspace: t.workspace,
            time: Date.now(),
          },
          ...next.activities,
        ],
      };
    });
    setToast(`Focusing on ${t.title}`);
  }
  function stopTimer() {
    setState((prev) => (prev ? stopInState(prev) : prev));
    setToast('Focus session saved to time tracking');
  }
  function pauseTimer() {
    setState((prev) =>
      prev?.timer
        ? {
            ...prev,
            timer: {
              ...prev.timer,
              accumulated: elapsed(prev.timer, Date.now()),
              startedAt: prev.timer.startedAt === null ? Date.now() : null,
            },
          }
        : prev,
    );
  }
  function exportData() {
    const a = document.createElement('a');
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    a.href = url;
    a.download = `daymark-demo-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Your local demo data has been exported');
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!validState(data)) throw new Error('Invalid export');
      setState(data);
      setToast('Demo data restored');
    } catch {
      setToast('This file is not a valid Daymark demo export');
    }
    if (importRef.current) importRef.current.value = '';
  }
  function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get('title')).trim();
    if (!title) return;
    const newTask: Task = {
      id: `DM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      title,
      description: String(data.get('description')),
      workspace: data.get('workspace') as Workspace,
      project: String(data.get('project') || ''),
      status: 'planned',
      priority: data.get('priority') as Task['priority'],
      phase: 'Planning',
      estimate: Number(data.get('estimate')),
      date: String(data.get('date')),
    };
    setState((prev) =>
      prev
        ? {
            ...prev,
            tasks: [...prev.tasks, newTask],
            activities: [
              {
                id: crypto.randomUUID(),
                taskId: newTask.id,
                title: 'A new task, a little more clarity',
                detail: title,
                workspace: newTask.workspace,
                time: Date.now(),
              },
              ...prev.activities,
            ],
          }
        : prev,
    );
    setCreate(false);
    setToast('Task added to your plan');
  }
  function saveProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') || '').trim();
    const description = String(form.get('description') || '').trim();
    const existing = projectEditor !== 'new' ? projectEditor : null;
    const projectWorkspace = existing?.workspace || (form.get('workspace') as Workspace);
    if (!name) {
      setProjectError('Enter a project name.');
      return;
    }
    if (
      projects.some(
        (p) =>
          p.id !== existing?.id &&
          p.workspace === projectWorkspace &&
          p.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setProjectError(
        'A project with this name already exists in this workspace, including archived projects.',
      );
      return;
    }
    const id = existing?.id || crypto.randomUUID();
    const time = Date.now();
    const event = {
      id: crypto.randomUUID(),
      title: existing ? `Project updated: ${name}` : `Project created: ${name}`,
      detail:
        existing && existing.name !== name ? `Renamed from ${existing.name}` : description || name,
      workspace: projectWorkspace,
      time,
    };
    setState((prev) => {
      if (!prev) return prev;
      const next = existing
        ? renameProject(prev, id, name, description)
        : {
            ...prev,
            projects: [
              ...projectsForState(prev),
              { id, name, description, workspace: projectWorkspace, archived: false },
            ],
          };
      return { ...next, activities: [event, ...next.activities] };
    });
    setProjectEditor(null);
    setProjectError('');
    setToast(existing ? 'Project updated' : 'Project created');
  }
  function setProjectArchived(project: Project, archived: boolean) {
    const event = {
      id: crypto.randomUUID(),
      title: `Project ${archived ? 'archived' : 'restored'}: ${project.name}`,
      detail: archived ? 'Tasks and history were kept' : 'Project available again',
      workspace: project.workspace,
      time: Date.now(),
    };
    setState((prev) =>
      prev
        ? {
            ...archiveProjectState(prev, project.id, archived),
            activities: [event, ...prev.activities],
          }
        : prev,
    );
    setArchiveProject(null);
    setToast(archived ? 'Project archived. Tasks and history were kept.' : 'Project restored');
  }
  const chartDays = Array.from(
    { length: period === 'Today' ? 1 : period === 'This month' ? new Date().getDate() : 7 },
    (_, i) => {
      const d = new Date(startOfPeriod);
      d.setDate(d.getDate() + i);
      const date = localDate(d);
      const sessions = scopedSessions.filter((s) => localDate(new Date(s.endedAt)) === date);
      const hours = (w: Workspace) =>
        +(
          sessions
            .filter((s) => state.tasks.find((t) => t.id === s.taskId)?.workspace === w)
            .reduce((n, s) => n + s.seconds, 0) / 3600
        ).toFixed(2);
      return {
        day:
          period === 'This month'
            ? String(d.getDate())
            : d.toLocaleDateString('en', { weekday: 'short' }),
        Office: hours('Office'),
        Personal: hours('Personal'),
        Learning: hours('Learning'),
      };
    },
  );

  return {
    state,
    setState,
    page,
    period,
    setPeriod,
    taskTab,
    setTaskTab,
    selected,
    setSelected,
    create,
    setCreate,
    taskWorkspace,
    setTaskWorkspace,
    projectEditor,
    setProjectEditor,
    archiveProject,
    setArchiveProject,
    showArchived,
    setShowArchived,
    projectError,
    setProjectError,
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    customize,
    setCustomize,
    notifications,
    setNotifications,
    mobile,
    setMobile,
    draggedTask,
    setDraggedTask,
    dropDate,
    setDropDate,
    phoneWidth,
    toast,
    storageError,
    plannerDate,
    setPlannerDate,
    importRef,
    today,
    workspace,
    projects,
    scopedTasks,
    todayTasks,
    visibleTasks,
    scopedSessions,
    periodSessions,
    startOfPeriod,
    totalSeconds,
    task,
    timerTask,
    focusTask,
    runningSeconds,
    completed,
    completedPercent,
    events,
    hoursLabel,
    navigate,
    updateTask,
    startTimer,
    stopTimer,
    pauseTimer,
    exportData,
    restore,
    addTask,
    saveProject,
    setProjectArchived,
    chartDays,
  };
}
