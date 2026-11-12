'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity as ActivityIcon,
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  FolderKanban,
  Globe2,
  Heart,
  House,
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
  Square,
  Star,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation, useTasks } from '@/lib/api/queries';
import { appSections, sectionForPath, settingsSections } from '@/lib/app-routes';
import { formatDuration, formatIsoDate } from '@/lib/dates';
import { ALL_WORKSPACES, useApp } from './context';
import { CreateTaskDialog } from './create-task-dialog';
import { SearchPalette } from './search-palette';
import { initials } from './shared';
import { TaskDrawer } from './task-drawer';
import { useTimerActions } from './timer-actions';
import { useTimerClock } from './timer-clock';

const sectionIcons: Record<string, LucideIcon> = {
  LayoutDashboard,
  Sun,
  CalendarDays,
  ListTodo,
  FolderKanban,
  Code2,
  Clock3,
  Activity: ActivityIcon,
  BookOpen,
  ChartNoAxesCombined,
};

export const workspaceIcons: Record<string, LucideIcon> = {
  briefcase: BriefcaseBusiness,
  leaf: Leaf,
  book: BookOpen,
  code: Code2,
  heart: Heart,
  home: House,
  star: Star,
  target: Target,
  globe: Globe2,
};

export const widgetNames = [
  'Time overview',
  'Today’s tasks',
  'Workspace balance',
  'Recent activity',
  'Weekly goals',
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const app = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionForPath(pathname);
  const pageName = section?.name ?? 'Overview';
  const [notifications, setNotifications] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [phoneWidth, setPhoneWidth] = useState(false);
  const timer = useTimerActions();
  const seconds = useTimerClock(timer.state);
  const todayOpen = useTasks({
    plannedFrom: app.today,
    plannedTo: app.today,
    completed: false,
    limit: 1,
    workspaceId: app.workspaceId,
  });
  const saveTheme = useApiMutation(
    (theme: 'dark' | 'light') => api.patch('/me/settings', { theme }),
    'settings',
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => setPhoneWidth(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    app.setMobileNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(
    app.settings.theme === 'light' ? 'light' : 'dark',
  );
  const toggleTheme = () => {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `daymark.theme=${next}; path=/; max-age=31536000; samesite=lax`;
    saveTheme.mutate(next);
  };

  const showFloatingTimer =
    timer.state?.active && !['/app', '/app/my-day', '/app/time-tracking'].includes(pathname);
  const showToolbar = !pathname.startsWith('/app/settings');
  const openToday = todayOpen.data?.total ?? 0;
  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <div className="app-shell">
      {app.mobileNavOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => app.setMobileNavOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        id="main-sidebar"
        inert={phoneWidth && !app.mobileNavOpen}
        className={`sidebar ${app.mobileNavOpen ? 'mobile-open' : ''}`}
      >
        <Link className="brand" href="/app">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          daymark<span className="brand-period">.</span>
        </Link>
        <div className="sidebar-heading">
          YOUR SPACE<span>⌘ K</span>
        </div>
        <button className="workspace-switch" onClick={() => app.setSearchOpen(true)}>
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <strong>{firstName}’s space</strong>
            <span>Private account</span>
          </div>
          <ChevronDown size={14} />
        </button>
        <div className="sidebar-heading workspace-heading">
          WORKSPACES
          <button aria-label="Create task in a workspace" onClick={() => app.openCreate()}>
            <Plus size={13} />
          </button>
        </div>
        <button
          className={`workspace-nav ${app.workspaceFilter === ALL_WORKSPACES ? 'selected' : ''}`}
          onClick={() => app.setWorkspaceFilter(ALL_WORKSPACES)}
        >
          <Globe2 size={16} />
          All workspaces<span>{app.activeWorkspaces.reduce((n, w) => n + w.openTasks, 0)}</span>
        </button>
        {app.activeWorkspaces.map((workspace) => {
          const Icon = workspaceIcons[workspace.icon] ?? BriefcaseBusiness;
          return (
            <button
              key={workspace.id}
              className={`workspace-nav ${app.workspaceFilter === workspace.id ? 'selected' : ''}`}
              onClick={() => app.setWorkspaceFilter(workspace.id)}
            >
              <Icon size={16} className={`ws-icon color-${workspace.color}`} />
              {workspace.name}
              <span>{workspace.openTasks}</span>
            </button>
          );
        })}
        <div className="sidebar-heading manage-heading">MANAGE</div>
        <nav aria-label="Main navigation">
          {appSections.map((item) => {
            const Icon = sectionIcons[item.icon] ?? LayoutDashboard;
            const active =
              pathname === item.path || (item.path !== '/app' && pathname.startsWith(item.path));
            return (
              <Link
                className={`nav-link ${active ? 'active' : ''}`}
                key={item.path}
                href={item.path}
              >
                <Icon size={17} />
                {item.name}
                {item.name === 'My day' && openToday > 0 && (
                  <span className="nav-count">{openToday}</span>
                )}
                {item.name === 'Overview' && active && <span className="nav-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link className="nav-link" href="/?home=1">
            <House size={17} />
            Home
          </Link>
          <div className="self-hosted">
            <span className="live-dot" />
            <span>Your space. Your data.</span>
            <ShieldCheck size={13} />
          </div>
          <Link
            className={`nav-link ${pathname.startsWith('/app/settings') ? 'active' : ''}`}
            href="/app/settings"
          >
            <Settings2 size={17} />
            Settings
          </Link>
          <div className="profile">
            <div className="avatar profile-avatar">{initials(user.name)}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <button
              className="theme-toggle"
              aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={toggleTheme}
            >
              {currentTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
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
              aria-expanded={app.mobileNavOpen}
              aria-controls="main-sidebar"
              onClick={() => app.setMobileNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Globe2 size={15} />
            <span>{app.workspaceLabel(app.workspaceId)}</span>
            <ChevronRight size={13} />
            <strong>{pageName}</strong>
          </div>
          <div className="topbar-actions">
            <button
              aria-label="Search tasks and pages"
              className="search-trigger"
              onClick={() => app.setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-label="Open reminders"
                aria-expanded={notifications}
                onClick={() => setNotifications((v) => !v)}
              >
                <Bell size={18} />
                {openToday > 0 && <span />}
              </button>
              {notifications && (
                <div className="popover reminders">
                  <h3>A gentle reminder</h3>
                  <p>
                    {openToday === 0
                      ? 'Nothing is waiting for you today. Plan something, or enjoy the space.'
                      : `You have ${openToday} open task${openToday === 1 ? '' : 's'} planned for today.`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push('/app/my-day');
                      setNotifications(false);
                    }}
                  >
                    See my day
                    <ArrowRight size={13} />
                  </Button>
                </div>
              )}
            </div>
            <div className="avatar small-avatar" aria-hidden="true">
              {initials(user.name)}
            </div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                YOUR DAY, WITH INTENTION
              </div>
              <h1>{section?.headline ?? [...settingsSections][0]!.headline}</h1>
              <p>
                {pageName === 'Overview'
                  ? `Welcome back, ${firstName}. Here’s how your world is coming together.`
                  : 'Your work, your life, and everything you’re moving forward.'}
              </p>
            </div>
            <div className="heading-actions">
              <span className="today-date">
                <CalendarDays size={14} />
                {formatIsoDate(app.today, { year: true })}
              </span>
              <Button onClick={() => app.openCreate()}>
                <Plus size={16} />
                New task
              </Button>
            </div>
          </div>
          {showToolbar && (
            <div className="dashboard-toolbar">
              <div className="view-tabs">
                {[
                  { label: 'Overview', href: '/app' },
                  { label: 'Today', href: '/app/my-day' },
                  { label: 'Insights', href: '/app/analytics' },
                ].map((tab) => (
                  <Link
                    key={tab.href}
                    className={pathname === tab.href ? 'active' : ''}
                    href={tab.href}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
              <div className="filter-actions">
                <label className="select-control">
                  <Globe2 size={13} />
                  <select
                    aria-label="Filter workspace"
                    value={app.workspaceFilter}
                    onChange={(event) => app.setWorkspaceFilter(event.target.value)}
                  >
                    <option value={ALL_WORKSPACES}>All workspaces</option>
                    {app.activeWorkspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} />
                </label>
                <label className="select-control period-control">
                  <CalendarDays size={13} />
                  <select
                    aria-label="Report date range"
                    value={app.period}
                    onChange={(event) => app.setPeriod(event.target.value as typeof app.period)}
                  >
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                  </select>
                  <ChevronDown size={12} />
                </label>
                {pathname === '/app' && (
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
                        {widgetNames.map((name) => (
                          <label key={name}>
                            <input
                              type="checkbox"
                              checked={!app.hiddenWidgets.includes(name)}
                              onChange={() => app.toggleWidget(name)}
                            />
                            {name}
                          </label>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setCustomize(false)}>
                          Done
                          <Check size={13} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {children}
          <footer className="page-footer">
            <span>
              <span className="live-dot" />
              Saved to your account
              {timer.state?.active ? ' · Timer persists across devices' : ''}
            </span>
            <span>
              A day worth making your mark on.<span className="footer-brand">daymark.</span>
            </span>
          </footer>
        </main>
      </div>
      {showFloatingTimer && timer.state?.active && (
        <div className="floating-timer">
          <span className={`live-dot ${timer.state.active.status === 'running' ? 'live' : ''}`} />
          <button onClick={() => app.openTask(timer.state!.active!.task.id)}>
            {timer.state.active.task.title}
          </button>
          <strong>{formatDuration(seconds)}</strong>
          <Button
            size="icon"
            variant="ghost"
            onClick={timer.toggle}
            disabled={timer.busy}
            aria-label="Pause or resume timer"
          >
            {timer.state.active.status === 'running' ? <Pause size={15} /> : <Play size={15} />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => timer.stop()}
            disabled={timer.busy}
            aria-label="Stop timer"
          >
            <Square size={13} />
          </Button>
        </div>
      )}
      {app.createDefaults && <CreateTaskDialog />}
      {app.selectedTaskId && <TaskDrawer taskId={app.selectedTaskId} />}
      {app.searchOpen && <SearchPalette />}
      {app.toastMessage && (
        <div className="toast" role="status">
          <Check size={15} />
          {app.toastMessage}
        </div>
      )}
    </div>
  );
}
