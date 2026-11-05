import { authenticated } from '@/server/http/handler';
import { ok, parseJsonBody } from '@/server/http/respond';
import { updateSettingsSchema, updateUserSettings } from '@/server/modules/users/service';

export const dynamic = 'force-dynamic';

export const PATCH = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, updateSettingsSchema);
  return ok(await updateUserSettings(db, userId, input));
});
