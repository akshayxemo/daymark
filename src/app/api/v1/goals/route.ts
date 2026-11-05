import { z } from 'zod';
import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody, parseQuery } from '@/server/http/respond';
import { isoDateSchema, uuidSchema } from '@/lib/validation/common';
import { weeklyGoalSchema } from '@/lib/validation/journal';
import { createWeeklyGoal, listWeeklyGoals } from '@/server/modules/journal/service';
import { startOfWeek, todayIn } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, request, settings }) => {
  const query = parseQuery(
    request,
    z.object({ weekStart: isoDateSchema.optional(), workspaceId: uuidSchema.optional() }),
  );
  const prefs = await settings();
  const weekStart = query.weekStart ?? startOfWeek(todayIn(prefs.timezone), prefs.weekStartsOn);
  return ok({ weekStart, goals: await listWeeklyGoals(db, userId, weekStart, query.workspaceId) });
});

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, weeklyGoalSchema);
  return created(await createWeeklyGoal(db, userId, input));
});
