import { authenticated } from '@/server/http/handler';
import { created, ok, parseJsonBody } from '@/server/http/respond';
import {
  createInvitation,
  createInvitationSchema,
  listInvitations,
} from '@/server/modules/users/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId }) => ok(await listInvitations(db, userId)));

export const POST = authenticated(async ({ db, userId, request }) => {
  const input = await parseJsonBody(request, createInvitationSchema);
  return created(await createInvitation(db, userId, input));
});
