import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { ok, parseQuery } from '@/server/http/respond';
import { listProjects } from '@/server/modules/projects/service';
import { searchTasks } from '@/server/modules/tasks/service';

export const dynamic = 'force-dynamic';

/** Command-palette search across tasks and projects. */
export const GET = authenticated(async ({ db, userId, request }) => {
  const { q } = parseQuery(request, z.object({ q: z.string().trim().max(120).default('') }));
  if (!q) return ok({ tasks: [], projects: [] });
  const [tasks, projects] = await Promise.all([
    searchTasks(db, userId, q, 8),
    listProjects(db, userId),
  ]);
  const needle = q.toLowerCase();
  return ok({
    tasks,
    projects: projects.filter((project) => project.name.toLowerCase().includes(needle)).slice(0, 5),
  });
});
