import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { createWorkspaceSchema } from '@/lib/validation/workspaces';
import { queryBoolean } from '@/lib/validation/common';
import { createWorkspace, listWorkspaces } from '@/server/modules/workspaces/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request }) => {
  const query = parseQuery(request, z.object({ includeArchived: queryBoolean }));
  return ok(await listWorkspaces(db, userId, { includeArchived: query.includeArchived }));
});

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, createWorkspaceSchema);
  return created(await createWorkspace(db, userId, input));
});
