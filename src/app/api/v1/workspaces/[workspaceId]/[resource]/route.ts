import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { created, ok, parseJsonBody } from '@/server/http/respond';
import {
  phaseInputSchema,
  statusInputSchema,
  tagInputSchema,
  taskTypeInputSchema,
  workspaceSettingsSchema,
} from '@/lib/validation/workspaces';
import {
  createPhase,
  createStatus,
  createTag,
  createTaskType,
  getWorkspaceConfiguration,
  getWorkspaceSettings,
  setWorkspaceArchived,
  updateWorkspaceSettings,
} from '@/server/modules/workspaces/service';

export const dynamic = 'force-dynamic';

type Params = { workspaceId: string; resource: string };

/**
 * Workspace sub-resources:
 *   GET  /configuration          statuses, task types, phases and tags
 *   GET  /settings  PATCH /settings
 *   POST /archive   POST /restore
 *   POST /statuses | /task-types | /phases | /tags
 */
export const GET = authenticated<Params>(async ({ db, userId, params }) => {
  switch (params.resource) {
    case 'configuration':
      return ok(await getWorkspaceConfiguration(db, userId, params.workspaceId));
    case 'settings':
      return ok(await getWorkspaceSettings(db, userId, params.workspaceId));
    default:
      throw new NotFoundError();
  }
});

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  if (params.resource !== 'settings') throw new NotFoundError();
  const input = await parseJsonBody(request, workspaceSettingsSchema);
  return ok(await updateWorkspaceSettings(db, userId, params.workspaceId, input));
});

export const POST = authenticated<Params>(async ({ db, userId, params, request }) => {
  const { workspaceId } = params;
  switch (params.resource) {
    case 'archive':
      return ok(await setWorkspaceArchived(db, userId, workspaceId, true));
    case 'restore':
      return ok(await setWorkspaceArchived(db, userId, workspaceId, false));
    case 'statuses':
      return created(
        await createStatus(
          db,
          userId,
          workspaceId,
          await parseJsonBody(request, statusInputSchema),
        ),
      );
    case 'task-types':
      return created(
        await createTaskType(
          db,
          userId,
          workspaceId,
          await parseJsonBody(request, taskTypeInputSchema),
        ),
      );
    case 'phases':
      return created(
        await createPhase(db, userId, workspaceId, await parseJsonBody(request, phaseInputSchema)),
      );
    case 'tags':
      return created(
        await createTag(db, userId, workspaceId, await parseJsonBody(request, tagInputSchema)),
      );
    default:
      throw new NotFoundError();
  }
});
