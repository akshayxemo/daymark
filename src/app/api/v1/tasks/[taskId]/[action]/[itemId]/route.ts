import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { noContent, ok, parseJsonBody } from '@/server/http/respond';
import {
  updateDeliveryRecordSchema,
  updateTaskRepositorySchema,
} from '@/lib/validation/development';
import {
  deleteDelivery,
  removeReference,
  removeTaskRepository,
  updateDelivery,
  updateTaskRepository,
} from '@/server/modules/development/service';
import { removeDependency } from '@/server/modules/tasks/service';

export const dynamic = 'force-dynamic';

type Params = { taskId: string; action: string; itemId: string };

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const { taskId, itemId } = params;
  switch (params.action) {
    case 'repositories':
      return ok(
        await updateTaskRepository(
          db,
          userId,
          taskId,
          itemId,
          await parseJsonBody(request, updateTaskRepositorySchema),
        ),
      );
    case 'deliveries':
      return ok(
        await updateDelivery(
          db,
          userId,
          taskId,
          itemId,
          await parseJsonBody(request, updateDeliveryRecordSchema),
        ),
      );
    default:
      throw new NotFoundError();
  }
});

export const DELETE = authenticated<Params>(async ({ db, userId, params }) => {
  const { taskId, itemId } = params;
  switch (params.action) {
    case 'dependencies':
      return ok(await removeDependency(db, userId, taskId, itemId));
    case 'repositories':
      await removeTaskRepository(db, userId, taskId, itemId);
      return noContent();
    case 'references':
      await removeReference(db, userId, taskId, itemId);
      return noContent();
    case 'deliveries':
      await deleteDelivery(db, userId, taskId, itemId);
      return noContent();
    default:
      throw new NotFoundError();
  }
});
