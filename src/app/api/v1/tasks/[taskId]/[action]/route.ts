import { authenticated } from '@/server/http/handler';
import { NotFoundError } from '@/server/http/errors';
import { created, ok, parseJsonBody } from '@/server/http/respond';
import {
  deliveryRecordSchema,
  developmentReferenceSchema,
  taskRepositorySchema,
} from '@/lib/validation/development';
import {
  changePhaseSchema,
  changeStatusSchema,
  dependencySchema,
  planTaskSchema,
} from '@/lib/validation/tasks';
import {
  addReference,
  addTaskRepository,
  recordDelivery,
} from '@/server/modules/development/service';
import {
  addDependency,
  changeTaskPhase,
  changeTaskStatus,
  duplicateTask,
  listDependencies,
  planTask,
  setTaskArchived,
} from '@/server/modules/tasks/service';

export const dynamic = 'force-dynamic';

type Params = { taskId: string; action: string };

/**
 * Task operations. Each one runs as a single transaction in the task service:
 *   POST /status        { statusId, reason? }
 *   POST /phase         { phaseId, notes? }
 *   POST /plan          { plannedDate, plannedMinutes?, reason? }
 *   POST /archive · /restore · /duplicate
 *   POST /dependencies  { dependsOnTaskId }
 *   POST /repositories  { repositoryId, branchName, ... }
 *   POST /references    { referenceType, referenceId, url, ... }
 *   POST /deliveries    { deliveryType, environment, deliveryStatus, ... }
 */
export const POST = authenticated<Params>(async ({ db, userId, params, request }) => {
  const { taskId } = params;
  switch (params.action) {
    case 'status':
      return ok(
        await changeTaskStatus(
          db,
          userId,
          taskId,
          await parseJsonBody(request, changeStatusSchema),
        ),
      );
    case 'phase':
      return ok(
        await changeTaskPhase(db, userId, taskId, await parseJsonBody(request, changePhaseSchema)),
      );
    case 'plan':
      return ok(await planTask(db, userId, taskId, await parseJsonBody(request, planTaskSchema)));
    case 'archive':
      return ok(await setTaskArchived(db, userId, taskId, true));
    case 'restore':
      return ok(await setTaskArchived(db, userId, taskId, false));
    case 'duplicate':
      return created(await duplicateTask(db, userId, taskId));
    case 'dependencies': {
      const input = await parseJsonBody(request, dependencySchema);
      return ok(await addDependency(db, userId, taskId, input.dependsOnTaskId));
    }
    case 'repositories':
      return created(
        await addTaskRepository(
          db,
          userId,
          taskId,
          await parseJsonBody(request, taskRepositorySchema),
        ),
      );
    case 'references':
      return created(
        await addReference(
          db,
          userId,
          taskId,
          await parseJsonBody(request, developmentReferenceSchema),
        ),
      );
    case 'deliveries':
      return created(
        await recordDelivery(
          db,
          userId,
          taskId,
          await parseJsonBody(request, deliveryRecordSchema),
        ),
      );
    default:
      throw new NotFoundError();
  }
});

export const GET = authenticated<Params>(async ({ db, userId, params }) => {
  if (params.action === 'dependencies')
    return ok(await listDependencies(db, userId, params.taskId));
  throw new NotFoundError();
});
