import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { createProjectSchema, listProjectsQuerySchema } from '@/lib/validation/projects';
import { createProject, listProjects } from '@/server/modules/projects/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(request, listProjectsQuerySchema);
  return ok(await listProjects(db, userId, query));
});

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, createProjectSchema);
  return created(await createProject(db, userId, input));
});
