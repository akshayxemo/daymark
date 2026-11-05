import { authenticated } from '@/server/http/handler';
import { noContent } from '@/server/http/respond';
import { revokeInvitation } from '@/server/modules/users/service';

export const dynamic = 'force-dynamic';

export const DELETE = authenticated<{ invitationId: string }>(async ({ db, userId, params }) => {
  await revokeInvitation(db, userId, params.invitationId);
  return noContent();
});
