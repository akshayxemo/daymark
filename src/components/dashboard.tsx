'use client';
import { DashboardDialogs } from '@/components/dashboard/dialogs';
import { useDashboard } from '@/components/dashboard/use-dashboard';
import {
  FocusCard,
  TimeChart,
  TasksCard,
  BalanceCard,
  ActivityCard,
  GoalsCard,
} from '@/components/dashboard/cards';
import { Metric, Journal } from '@/components/dashboard/widgets';
import { usePathname, useRouter } from 'next/navigation';
import { sectionFromPath, sectionPaths, type Section } from '@/lib/routes';
import { stopInState, validState } from '@/lib/dashboard-state';
import { SettingsPage } from '@/components/pages/settings-page';
import { DevelopmentPage } from '@/components/pages/development-page';
import { ProjectsPage } from '@/components/pages/projects-page';
import { PlannerPage } from '@/components/pages/planner-page';

import { useId, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Code2,
  Command,
  Ellipsis,
  ExternalLink,
  FolderKanban,
  GitBranch,
  Globe2,
  LayoutDashboard,
  Leaf,
  ListTodo,
  Menu,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Target,
  Timer as TimerIcon,
  TrendingUp,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  elapsed,
  archiveProjectState,
  formatDuration,
  isCompleted,
  localDate,
  makeInitialState,
  phases,
  projectsForState,
  renameProject,
  statuses,
  workspaces,
  type State,
  type Task,
  type Workspace,
  type Project,
} from '@/lib/model';

const STORE = 'daymark.design.v1';
const nav: { name: string; icon: LucideIcon }[] = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'My day', icon: Sun },
  { name: 'Planner', icon: CalendarDays },
  { name: 'Tasks', icon: ListTodo },
  { name: 'Projects', icon: FolderKanban },
  { name: 'Development', icon: Code2 },
  { name: 'Time tracking', icon: Clock3 },
  { name: 'Activity', icon: ActivityIcon },
  { name: 'Journal', icon: BookOpen },
  { name: 'Analytics', icon: ChartNoAxesCombined },
];
const workspaceIcons = { Office: BriefcaseBusiness, Personal: Leaf, Learning: BookOpen };
const widgetNames = [
  'Time overview',
  'Today’s tasks',
  'Workspace balance',
  'Recent activity',
  'Weekly goals',
];
import { WorkspaceTag, SectionHead, Modal } from '@/components/dashboard/shared';
export default function Dashboard() {
  const dashboard = useDashboard();
  if (!dashboard)
    return (
      <div className="loading">
        <span className="brand-mark">
          <span />
          <span />
          <span />
        </span>
        <p>Making room for your day…</p>
      </div>
    );
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
  const focusCard = (
    <FocusCard
      state={state}
      focusTask={focusTask}
      runningSeconds={runningSeconds}
      pauseTimer={pauseTimer}
      stopTimer={stopTimer}
      startTimer={startTimer}
    />
  );
  const timeChart = (
    <TimeChart
      hoursLabel={hoursLabel}
      totalSeconds={totalSeconds}
      period={period}
      chartDays={chartDays}
    />
  );
  const tasksCard = (
    <TasksCard
      page={page}
      scopedTasks={scopedTasks}
      todayTasks={todayTasks}
      completed={completed}
      setCreate={setCreate}
      navigate={navigate}
      taskTab={taskTab}
      setTaskTab={setTaskTab}
      visibleTasks={visibleTasks}
      updateTask={updateTask}
      setSelected={setSelected}
    />
  );
  const balanceCard = (
    <BalanceCard
      state={state}
      periodSessions={periodSessions}
      totalSeconds={totalSeconds}
      hoursLabel={hoursLabel}
      workspace={workspace}
    />
  );
  const activityCard = (
    <ActivityCard page={page} navigate={navigate} events={events} setSelected={setSelected} />
  );
  const goalsCard = <GoalsCard state={state} setState={setState} />;

  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        id="main-sidebar"
        inert={phoneWidth && !mobile}
        className={`sidebar ${mobile ? 'mobile-open' : ''}`}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('Overview');
          }}
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          daymark<span className="brand-period">.</span>
        </a>
        <div className="sidebar-heading">
          YOUR SPACE<span>⌘ K</span>
        </div>
        <button className="workspace-switch" onClick={() => setSearchOpen(true)}>
          <div className="avatar">AK</div>
          <div>
            <strong>Akshay’s space</strong>
            <span>Personal workspace</span>
          </div>
          <ChevronDown size={14} />
        </button>
        <div className="sidebar-heading workspace-heading">
          WORKSPACES
          <button aria-label="Create task in a workspace" onClick={() => setCreate(true)}>
            <Plus size={13} />
          </button>
        </div>
        <button
          className={`workspace-nav ${workspace === 'All workspaces' ? 'selected' : ''}`}
          onClick={() => setState((p) => (p ? { ...p, workspace: 'All workspaces' } : p))}
        >
          <Globe2 size={16} />
          All workspaces<span>{state.tasks.length}</span>
        </button>
        {workspaces.map((w) => {
          const Icon = workspaceIcons[w];
          return (
            <button
              key={w}
              className={`workspace-nav ${workspace === w ? 'selected' : ''}`}
              onClick={() => setState((p) => (p ? { ...p, workspace: w } : p))}
            >
              <Icon size={16} className={`ws-icon ${w.toLowerCase()}`} />
              {w}
              <span>{state.tasks.filter((t) => t.workspace === w).length}</span>
            </button>
          );
        })}
        <div className="sidebar-heading manage-heading">MANAGE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              className={`nav-link ${page === name ? 'active' : ''}`}
              key={name}
              onClick={() => navigate(name)}
            >
              <Icon size={17} />
              {name}
              {name === 'My day' && (
                <span className="nav-count">
                  {todayTasks.filter((t) => !isCompleted(t)).length}
                </span>
              )}
              {name === 'Overview' && page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="self-hosted">
            <span className="live-dot" />
            <span>Your space. Your data.</span>
            <ShieldCheck size={13} />
          </div>
          <button
            className={`nav-link ${page === 'Settings' ? 'active' : ''}`}
            onClick={() => navigate('Settings')}
          >
            <Settings2 size={17} />
            Settings
          </button>
          <div className="profile">
            <div className="avatar profile-avatar">AK</div>
            <div>
              <strong>Akshay Kumar</strong>
              <span>Local demo</span>
            </div>
            <button
              className="theme-toggle"
              aria-label={`Switch to ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() =>
                setState((p) => (p ? { ...p, theme: p.theme === 'dark' ? 'light' : 'dark' } : p))
              }
            >
              {state.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="main-sidebar"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <Globe2 size={15} />
            <span>{workspace}</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            <button
              aria-label="Search tasks and pages"
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="demo-badge">DEMO</span>
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-label="Open reminders"
                onClick={() => setNotifications((v) => !v)}
              >
                <Bell size={18} />
                <span />
              </button>
              {notifications && (
                <div className="popover reminders">
                  <h3>A gentle reminder</h3>
                  <p>
                    You have {todayTasks.filter((t) => !isCompleted(t)).length} open tasks planned
                    for today.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate('My day');
                      setNotifications(false);
                    }}
                  >
                    See my day
                    <ArrowRight size={13} />
                  </Button>
                </div>
              )}
            </div>
            <div className="avatar small-avatar">AK</div>
          </div>
        </header>
        <main>
          {storageError && <div className="storage-warning">{storageError}</div>}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                YOUR DAY, WITH INTENTION
              </div>
              <h1>
                {page === 'Overview'
                  ? 'A little clarity. A lot of possibility.'
                  : (
                      {
                        'My day': 'Make space for what matters.',
                        Planner: 'A good week starts with a plan.',
                        Tasks: 'Big ideas. Small next steps.',
                        Projects: 'Give your ideas a place to grow.',
                        Development: 'From first commit to delivered.',
                        'Time tracking': 'Every focused moment counts.',
                        Activity: 'A record of moving forward.',
                        Journal: 'A moment to reflect.',
                        Analytics: 'Understand your own rhythm.',
                        Settings: 'Make this space your own.',
                      } as Record<string, string>
                    )[page]}
              </h1>
              <p>
                {page === 'Overview'
                  ? 'Welcome back, Akshay. Here’s how your world is coming together.'
                  : 'Your work, your life, and everything you’re moving forward.'}
              </p>
            </div>
            <div className="heading-actions">
              <span className="today-date">
                <CalendarDays size={14} />
                {new Date().toLocaleDateString('en', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} />
                New task
              </Button>
            </div>
          </div>
          <div className="dashboard-toolbar">
            <div className="view-tabs">
              {['Overview', 'My day', 'Analytics'].map((n) => (
                <button key={n} className={page === n ? 'active' : ''} onClick={() => navigate(n)}>
                  {n === 'Overview' ? 'Overview' : n === 'My day' ? 'Today' : 'Insights'}
                </button>
              ))}
            </div>
            <div className="filter-actions">
              <label className="select-control">
                <Globe2 size={13} />
                <select
                  aria-label="Filter workspace"
                  value={workspace}
                  onChange={(e) =>
                    setState((p) =>
                      p ? { ...p, workspace: e.target.value as State['workspace'] } : p,
                    )
                  }
                >
                  {['All workspaces', ...workspaces].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
                <ChevronDown size={12} />
              </label>
              <label className="select-control period-control">
                <CalendarDays size={13} />
                <select
                  aria-label="Report date range"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {['Today', 'This week', 'This month'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown size={12} />
              </label>
              <div className="customize-wrap">
                <Button
                  aria-label="Customize dashboard"
                  aria-expanded={customize}
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomize((v) => !v)}
                >
                  <SlidersHorizontal size={13} />
                  <span>Customize</span>
                </Button>
                {customize && (
                  <div className="popover customize">
                    <h3>Make it your overview</h3>
                    <p>Choose the widgets you want to see.</p>
                    {widgetNames.map((w) => (
                      <label key={w}>
                        <input
                          type="checkbox"
                          checked={!state.hidden.includes(w)}
                          onChange={() =>
                            setState((p) =>
                              p
                                ? {
                                    ...p,
                                    hidden: p.hidden.includes(w)
                                      ? p.hidden.filter((x) => x !== w)
                                      : [...p.hidden, w],
                                  }
                                : p,
                            )
                          }
                        />
                        {w}
                      </label>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setCustomize(false)}>
                      Done
                      <Check size={13} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {(page === 'Overview' || page === 'Analytics' || page === 'My day') && (
            <div className="metrics-grid">
              <Metric
                icon={CircleCheck}
                label="Tasks completed"
                value={`${completed}`}
                unit={`/ ${todayTasks.length}`}
                note="of today’s planned tasks"
                detail={`${completedPercent}% complete`}
                progress={completedPercent}
              />
              <Metric
                icon={Clock3}
                label="Time invested"
                value={`${Math.floor(totalSeconds / 3600)}`}
                unit={`h ${Math.floor((totalSeconds % 3600) / 60)}m`}
                note={`Across ${periodSessions.length} recorded sessions`}
                detail={period.toLowerCase()}
                spark
              />
              <Metric
                icon={Target}
                label="Longest focus"
                value={String(
                  Math.floor(Math.max(0, ...periodSessions.map((s) => s.seconds)) / 60),
                )}
                unit="min"
                note="Space for uninterrupted work"
                detail="Keep your rhythm"
                bars
              />
              <Metric
                icon={Code2}
                label="Production verified"
                value={String(
                  events.filter((a) => a.id === 'a3' && a.time >= startOfPeriod.getTime()).length,
                )}
                unit="delivery"
                note="Verified separately from deployment"
                detail="Demo delivery record"
                delivery
              />
            </div>
          )}
          {page === 'Overview' && (
            <>
              <div className="dashboard-grid top-grid">
                {!state.hidden.includes('Time overview') && timeChart}
                {focusCard}
              </div>
              <div className="dashboard-grid middle-grid">
                {!state.hidden.includes('Today’s tasks') && tasksCard}
                {!state.hidden.includes('Workspace balance') && balanceCard}
              </div>
              <div className="dashboard-grid bottom-grid">
                {!state.hidden.includes('Recent activity') && activityCard}
                {!state.hidden.includes('Weekly goals') && goalsCard}
              </div>
            </>
          )}
          {page === 'Tasks' && tasksCard}
          {page === 'My day' && (
            <>
              <div className="dashboard-grid middle-grid">
                {tasksCard}
                {focusCard}
              </div>
              <Journal state={state} setState={setState} />
            </>
          )}
          {page === 'Analytics' && (
            <>
              <div className="dashboard-grid top-grid">
                {timeChart}
                {balanceCard}
              </div>
              <div className="insight-note">
                <TrendingUp size={18} />
                <div>
                  <strong>Progress has more than one dimension.</strong>
                  <p>
                    Completion measures execution. Tracked time measures effort. Deliveries record
                    outcomes. Each tells its own part of your story.
                  </p>
                </div>
              </div>
            </>
          )}
          {page === 'Time tracking' && (
            <>
              <div className="dashboard-grid top-grid">
                {timeChart}
                {focusCard}
              </div>
              <section className="card">
                <SectionHead
                  title="Session history"
                  subtitle="Saved focus sessions, measured from start and pause timestamps."
                />
                {scopedSessions
                  .slice()
                  .sort((a, b) => b.endedAt - a.endedAt)
                  .map((s) => {
                    const t = state.tasks.find((t) => t.id === s.taskId)!;
                    return (
                      <div className="session-row" key={s.id}>
                        <Clock3 size={16} />
                        <button onClick={() => setSelected(t.id)}>{t.title}</button>
                        <WorkspaceTag name={t.workspace} />
                        <time>
                          {new Date(s.endedAt).toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                        <strong>{hoursLabel(s.seconds)}</strong>
                      </div>
                    );
                  })}
              </section>
            </>
          )}
          {page === 'Activity' && activityCard}
          {page === 'Journal' && <Journal state={state} setState={setState} />}
          {page === 'Planner' && (
            <PlannerPage
              plannerDate={plannerDate}
              setPlannerDate={setPlannerDate}
              scopedTasks={scopedTasks}
              today={today}
              dropDate={dropDate}
              setDropDate={setDropDate}
              draggedTask={draggedTask}
              setDraggedTask={setDraggedTask}
              updateTask={updateTask}
              setSelected={setSelected}
              setCreate={setCreate}
              goalsCard={goalsCard}
            />
          )}
          {page === 'Projects' && (
            <ProjectsPage
              showArchived={showArchived}
              setShowArchived={setShowArchived}
              setProjectError={setProjectError}
              setProjectEditor={setProjectEditor}
              projects={projects}
              workspace={workspace}
              state={state}
              setProjectArchived={setProjectArchived}
              setArchiveProject={setArchiveProject}
              setSelected={setSelected}
            />
          )}
          {page === 'Development' && (
            <DevelopmentPage
              scopedTasks={scopedTasks}
              setSelected={setSelected}
              workspace={workspace}
            />
          )}
          {page === 'Settings' && (
            <SettingsPage
              state={state}
              setState={setState}
              exportData={exportData}
              importRef={importRef}
              restore={restore}
              navigate={navigate}
              setCustomize={setCustomize}
            />
          )}
          <footer className="page-footer">
            <span>
              <span className="live-dot" />
              {storageError ? 'Local saving unavailable' : 'All changes saved locally'}
              {state.timer ? ' · Timer persists across refreshes' : ''}
            </span>
            <span>
              A day worth making your mark on.<span className="footer-brand">daymark.</span>
            </span>
          </footer>
        </main>
      </div>
      {state.timer && page !== 'Overview' && page !== 'My day' && page !== 'Time tracking' && (
        <div className="floating-timer">
          <span className="live-dot" />
          <button onClick={() => setSelected(state.timer!.taskId)}>{timerTask?.title}</button>
          <strong>{formatDuration(runningSeconds)}</strong>
          <Button
            size="icon"
            variant="ghost"
            onClick={pauseTimer}
            aria-label="Pause or resume timer"
          >
            {state.timer.startedAt ? <Pause size={15} /> : <Play size={15} />}
          </Button>
          <Button size="icon" variant="ghost" onClick={stopTimer} aria-label="Stop timer">
            <Square size={13} />
          </Button>
        </div>
      )}
      <DashboardDialogs dashboard={dashboard} nav={nav} />
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
