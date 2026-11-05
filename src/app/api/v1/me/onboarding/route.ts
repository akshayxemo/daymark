import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { onboardingSchema } from '@/lib/validation/workspaces';
import { markOnboardingComplete, updateUserSettings } from '@/server/modules/users/service';
import { createWorkspace, listWorkspaces } from '@/server/modules/workspaces/service';
import { withTransaction } from '@/server/db/transaction';

export const dynamic = 'force-dynamic';

/** First-run setup: creates the chosen workspaces and stores the timezone. */
export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, onboardingSchema);
  const workspaces = await withTransaction(db, async (tx) => {
    const existing = await listWorkspaces(tx, userId, { includeArchived: true });
    const existingNames = new Set(existing.map((w) => w.name.toLowerCase()));
    for (const workspace of input.workspaces) {
      if (existingNames.has(workspace.name.toLowerCase())) continue;
      await createWorkspace(tx, userId, workspace);
    }
    await updateUserSettings(tx, userId, { timezone: input.timezone });
    await markOnboardingComplete(tx, userId);
    return listWorkspaces(tx, userId);
  });
  return ok({ workspaces });
});
