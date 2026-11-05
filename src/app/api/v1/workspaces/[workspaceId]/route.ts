import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateWorkspaceSchema } from '@/lib/validation/workspaces';
import { getWorkspace, updateWorkspace } from '@/server/modules/workspaces/service';

export const dynamic = 'force-dynamic';

type Params = { workspaceId: string };

export const GET = authenticated<Params>(async ({ db, userId, params }) =>
  ok(await getWorkspace(db, userId, params.workspaceId)),
);

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateWorkspaceSchema);
  return ok(await updateWorkspace(db, userId, params.workspaceId, input));
});
