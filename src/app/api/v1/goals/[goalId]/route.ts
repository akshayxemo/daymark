import { authenticated } from '@/server/http/handler';
import { noContent, ok, parseJsonBody } from '@/server/http/respond';
import { updateWeeklyGoalSchema } from '@/lib/validation/journal';
import { deleteWeeklyGoal, updateWeeklyGoal } from '@/server/modules/journal/service';

export const dynamic = 'force-dynamic';

type Params = { goalId: string };

export const PATCH = authenticated<Params>(async ({ db, userId, params, request }) => {
  const input = await parseJsonBody(request, updateWeeklyGoalSchema);
  return ok(await updateWeeklyGoal(db, userId, params.goalId, input));
});

export const DELETE = authenticated<Params>(async ({ db, userId, params }) => {
  await deleteWeeklyGoal(db, userId, params.goalId);
  return noContent();
});
