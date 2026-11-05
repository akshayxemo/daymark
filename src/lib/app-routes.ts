/**
 * Authenticated application routes. Everything lives under /app so the
 * public website owns the root and crawlers can be told to stay out.
 */
export const appSections = [
  {
    name: 'Overview',
    path: '/app',
    icon: 'LayoutDashboard',
    headline: 'A little clarity. A lot of possibility.',
  },
  { name: 'My day', path: '/app/my-day', icon: 'Sun', headline: 'Make space for what matters.' },
  {
    name: 'Planner',
    path: '/app/planner',
    icon: 'CalendarDays',
    headline: 'A good week starts with a plan.',
  },
  { name: 'Tasks', path: '/app/tasks', icon: 'ListTodo', headline: 'Big ideas. Small next steps.' },
  {
    name: 'Projects',
    path: '/app/projects',
    icon: 'FolderKanban',
    headline: 'Give your ideas a place to grow.',
  },
  {
    name: 'Development',
    path: '/app/development',
    icon: 'Code2',
    headline: 'From first commit to delivered.',
  },
  {
    name: 'Time tracking',
    path: '/app/time-tracking',
    icon: 'Clock3',
    headline: 'Every focused moment counts.',
  },
  {
    name: 'Activity',
    path: '/app/activity',
    icon: 'Activity',
    headline: 'A record of moving forward.',
  },
  { name: 'Journal', path: '/app/journal', icon: 'BookOpen', headline: 'A moment to reflect.' },
  {
    name: 'Analytics',
    path: '/app/analytics',
    icon: 'ChartNoAxesCombined',
    headline: 'Understand your own rhythm.',
  },
] as const;

export type AppSectionName = (typeof appSections)[number]['name'];

export const settingsSections = [
  { name: 'Settings', path: '/app/settings', headline: 'Make this space your own.' },
  {
    name: 'Workspaces',
    path: '/app/settings/workspaces',
    headline: 'Shape the spaces you work in.',
  },
  { name: 'Account', path: '/app/settings/account', headline: 'Your account, your rules.' },
] as const;

export function sectionForPath(pathname: string) {
  const all = [...appSections, ...settingsSections];
  const exact = all.find((section) => section.path === pathname);
  if (exact) return exact;
  return [...all]
    .sort((a, b) => b.path.length - a.path.length)
    .find((section) => pathname.startsWith(section.path + '/'));
}
