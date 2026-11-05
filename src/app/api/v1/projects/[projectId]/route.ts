import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateProjectSchema } from '@/lib/validation/projects';
import { getProject, updateProject } from '@/server/modules/projects/service';

export const dynamic = 'force-dynamic';

type Params = { projectId: string };

export const GET = authenticated<Params>(async ({ db, userId, params }) =>
  ok(await getProject(db, userId, params.projectId)),
);

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateProjectSchema);
  return ok(await updateProject(db, userId, params.projectId, input));
});
