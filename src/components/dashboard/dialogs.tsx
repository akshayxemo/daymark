'use client';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  FolderKanban,
  ListTodo,
  Play,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, WorkspaceTag } from '@/components/dashboard/shared';
import { statuses, phases, workspaces, type Workspace, type Task } from '@/lib/model';
import type { useDashboard } from '@/components/dashboard/use-dashboard';

type Props = {
  dashboard: NonNullable<ReturnType<typeof useDashboard>>;
  nav: { name: string; icon: LucideIcon }[];
};
export function DashboardDialogs({ dashboard, nav }: Props) {
  const {
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
  } = dashboard;
  return (
    <>
      {' '}
      {projectEditor && (
        <Modal
          title={projectEditor === 'new' ? 'New project' : 'Edit project'}
          onClose={() => {
            setProjectEditor(null);
            setProjectError('');
          }}
        >
          <form className="task-form" onSubmit={saveProject}>
            <p>Organize related tasks in one workspace.</p>
            <label>
              Project name
              <input
                name="name"
                autoFocus
                required
                maxLength={120}
                defaultValue={projectEditor === 'new' ? '' : projectEditor.name}
              />
            </label>
            <label>
              Workspace
              {projectEditor === 'new' ? (
                <select
                  name="workspace"
                  defaultValue={workspace === 'All workspaces' ? 'Office' : workspace}
                >
                  {workspaces.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              ) : (
                <input value={projectEditor.workspace} disabled />
              )}
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={3}
                maxLength={1000}
                defaultValue={projectEditor === 'new' ? '' : projectEditor.description}
              />
            </label>
            {projectError && (
              <p className="project-error" role="alert">
                {projectError}
              </p>
            )}
            <div className="form-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setProjectEditor(null);
                  setProjectError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {projectEditor === 'new' ? 'Create project' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {archiveProject && (
        <Modal title="Archive project?" onClose={() => setArchiveProject(null)}>
          <div className="task-form">
            <p>
              Archive “{archiveProject.name}” in {archiveProject.workspace}? Its tasks, time
              records, and activity remain available. You can restore the project later.
            </p>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setArchiveProject(null)}>
                Cancel
              </Button>
              <Button onClick={() => setProjectArchived(archiveProject, true)}>
                Archive project
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {create && (
        <Modal title="A new next step" onClose={() => setCreate(false)}>
          <form className="task-form" onSubmit={addTask}>
            <p>Give it a name. You can figure out the rest along the way.</p>
            <label>
              Task name
              <input
                name="title"
                autoFocus
                required
                maxLength={180}
                placeholder="What would you like to move forward?"
              />
            </label>
            <div className="form-grid">
              <label>
                Workspace
                <select
                  name="workspace"
                  value={taskWorkspace}
                  onChange={(e) => setTaskWorkspace(e.target.value as Workspace)}
                >
                  {workspaces.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
              <label>
                Project
                <select name="project" key={taskWorkspace} defaultValue="">
                  <option value="">No project</option>
                  {projects
                    .filter((p) => p.workspace === taskWorkspace && !p.archived)
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Priority
                <select name="priority" defaultValue="Medium">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
              <label>
                Estimate (minutes)
                <input
                  name="estimate"
                  type="number"
                  min="0"
                  max="100000"
                  defaultValue="30"
                  required
                />
              </label>
            </div>
            <label>
              Planned date
              <input
                type="date"
                name="date"
                defaultValue={page === 'Planner' ? plannerDate : today}
                required
              />
            </label>
            <label>
              A little context
              <textarea
                name="description"
                rows={3}
                placeholder="Notes, ideas, or a useful starting point…"
              />
            </label>
            <div className="form-actions">
              <Button variant="ghost" type="button" onClick={() => setCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Plus size={15} />
                Create task
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {task && (
        <Modal title="Task details" drawer onClose={() => setSelected(null)}>
          <div className="task-detail">
            <div className="detail-id">
              <span>{task.id}</span>
              <WorkspaceTag name={task.workspace} />
            </div>
            <h1>{task.title}</h1>
            <p className="detail-project">
              <FolderKanban size={14} />
              {task.project || 'No project'}
            </p>
            <div className="detail-properties">
              <label>
                Project
                <select
                  value={task.project}
                  onChange={(e) => updateTask(task.id, { project: e.target.value })}
                >
                  <option value="">No project</option>
                  {projects
                    .filter(
                      (p) =>
                        p.workspace === task.workspace && (!p.archived || p.name === task.project),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                        {p.archived ? ' (archived)' : ''}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={task.status}
                  onChange={(e) => updateTask(task.id, { status: e.target.value })}
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Phase
                <select
                  value={task.phase}
                  onChange={(e) => updateTask(task.id, { phase: e.target.value })}
                >
                  {phases.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={task.priority}
                  onChange={(e) =>
                    updateTask(task.id, { priority: e.target.value as Task['priority'] })
                  }
                >
                  {['High', 'Medium', 'Low'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                Planned date
                <input
                  type="date"
                  value={task.date}
                  onChange={(e) => e.target.value && updateTask(task.id, { date: e.target.value })}
                />
              </label>
            </div>
            <h3>Description</h3>
            <p className="detail-description">
              {task.description || 'A blank page for a new beginning.'}
            </p>
            <div className="detail-estimate">
              <Clock3 size={15} />
              {task.estimate} minutes estimated<span>·</span>
              {hoursLabel(
                state.sessions
                  .filter((s) => s.taskId === task.id)
                  .reduce((n, s) => n + s.seconds, 0),
              )}{' '}
              tracked
            </div>
            <Button
              onClick={() => startTimer(task)}
              disabled={!!state.timer && state.timer.taskId === task.id}
            >
              <Play size={14} />
              {state.timer?.taskId === task.id
                ? 'Session already active'
                : state.timer
                  ? 'Save current & focus on this'
                  : 'Focus on this task'}
            </Button>
            <h3 className="detail-history-heading">Activity history</h3>
            <p className="detail-hint">Changes are added to the local activity history.</p>
            {state.activities
              .filter((a) => a.taskId === task.id)
              .map((a) => (
                <div className="detail-event" key={a.id}>
                  <span className="live-dot" />
                  <div>
                    <p>{a.title}</p>
                    <time>{new Date(a.time).toLocaleString()}</time>
                  </div>
                </div>
              ))}
            {!state.activities.some((a) => a.taskId === task.id) && (
              <p className="empty">Make a change to begin this task’s history.</p>
            )}
          </div>
        </Modal>
      )}
      {searchOpen && (
        <Modal
          title="Find a little clarity"
          onClose={() => {
            setSearchOpen(false);
            setQuery('');
          }}
        >
          <div className="global-search">
            <Search size={19} />
            <input
              autoFocus
              aria-label="Search tasks and pages"
              placeholder="Search tasks, projects, or pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="search-results">
            {state.tasks
              .filter((t) =>
                `${t.title} ${t.project} ${t.workspace}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelected(t.id);
                    setSearchOpen(false);
                    setQuery('');
                  }}
                >
                  <ListTodo size={17} />
                  <div>
                    <strong>{t.title}</strong>
                    <span>
                      {t.project} · {t.workspace}
                    </span>
                  </div>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {nav
              .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
              .map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => {
                    navigate(name);
                    setSearchOpen(false);
                    setQuery('');
                  }}
                >
                  <Icon size={17} />
                  <div>
                    <strong>{name}</strong>
                    <span>Go to page</span>
                  </div>
                  <ArrowRight size={14} />
                </button>
              ))}
            {!state.tasks.some((t) =>
              `${t.title} ${t.project} ${t.workspace}`.toLowerCase().includes(query.toLowerCase()),
            ) &&
              !nav.some((n) => n.name.toLowerCase().includes(query.toLowerCase())) && (
                <div className="empty">No matches. Try another word or create a task.</div>
              )}
          </div>
        </Modal>
      )}
    </>
  );
}
