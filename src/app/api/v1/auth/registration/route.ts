import { getEnv } from '@/server/config/env';
import { getRegistrationPolicy } from '@/server/auth/registration';
import { publicRoute } from '@/server/http/handler';
import { ok } from '@/server/http/respond';

export const dynamic = 'force-dynamic';

/** Tells the registration page whether sign-up is open, invite-only or closed. */
export const GET = publicRoute(async ({ db }) => {
  const policy = await getRegistrationPolicy(db, getEnv());
  return ok({
    open: policy.open,
    inviteOnly: policy.inviteOnly,
    isFirstUser: policy.isFirstUser,
    deploymentMode: policy.deploymentMode,
  });
});
