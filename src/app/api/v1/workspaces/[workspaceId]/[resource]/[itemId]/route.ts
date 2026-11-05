import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { noContent, ok, parseJsonBody } from '@/server/http/respond';
import {
  phaseUpdateSchema,
  statusUpdateSchema,
  tagInputSchema,
  taskTypeUpdateSchema,
} from '@/lib/validation/workspaces';
import {
  archivePhase,
  archiveStatus,
  archiveTaskType,
  deleteTag,
  updatePhase,
  updateStatus,
  updateTag,
  updateTaskType,
} from '@/server/modules/workspaces/service';

export const dynamic = 'force-dynamic';

type Params = { workspaceId: string; resource: string; itemId: string };

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const { workspaceId, itemId } = params;
  switch (params.resource) {
    case 'statuses':
      return ok(
        await updateStatus(
          db,
          userId,
          workspaceId,
          itemId,
          await parseJsonBody(request, statusUpdateSchema),
        ),
      );
    case 'task-types':
      return ok(
        await updateTaskType(
          db,
          userId,
          workspaceId,
          itemId,
          await parseJsonBody(request, taskTypeUpdateSchema),
        ),
      );
    case 'phases':
      return ok(
        await updatePhase(
          db,
          userId,
          workspaceId,
          itemId,
          await parseJsonBody(request, phaseUpdateSchema),
        ),
      );
    case 'tags':
      return ok(
        await updateTag(
          db,
          userId,
          workspaceId,
          itemId,
          await parseJsonBody(request, tagInputSchema.partial()),
        ),
      );
    default:
      throw new NotFoundError();
  }
});

export const DELETE = authenticated<Params>(async ({ db, userId, params }) => {
  const { workspaceId, itemId } = params;
  switch (params.resource) {
    case 'statuses':
      await archiveStatus(db, userId, workspaceId, itemId);
      break;
    case 'task-types':
      await archiveTaskType(db, userId, workspaceId, itemId);
      break;
    case 'phases':
      await archivePhase(db, userId, workspaceId, itemId);
      break;
    case 'tags':
      await deleteTag(db, userId, workspaceId, itemId);
      break;
    default:
      throw new NotFoundError();
  }
  return noContent();
});
