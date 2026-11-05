export const sectionPaths = {
  Overview: '/',
  'My day': '/my-day',
  Planner: '/planner',
  Tasks: '/tasks',
  Projects: '/projects',
  Development: '/development',
  'Time tracking': '/time-tracking',
  Activity: '/activity',
  Journal: '/journal',
  Analytics: '/analytics',
  Settings: '/settings',
} as const;

export type Section = keyof typeof sectionPaths;
export function sectionFromPath(pathname: string): Section | undefined {
  return (Object.keys(sectionPaths) as Section[]).find(
    (section) => sectionPaths[section] === pathname,
  );
}
