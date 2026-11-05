import { getEnv } from '@/server/config/env';
import { getRegistrationPolicy } from '@/server/auth/registration';
import { authenticated } from '@/server/http/handler';
import { ok } from '@/server/http/respond';
import { getUserSettings, isOwner } from '@/server/modules/users/service';

export const dynamic = 'force-dynamic';

export const GET = authenticated(async ({ db, userId, session }) => {
  const env = getEnv();
  const [settings, owner, policy] = await Promise.all([
    getUserSettings(db, userId),
    isOwner(db, userId),
    getRegistrationPolicy(db, env),
  ]);
  return ok({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      isOwner: owner,
    },
    settings,
    registration: { mode: policy.mode, deploymentMode: policy.deploymentMode },
    email: { provider: env.emailProvider, requireVerification: env.REQUIRE_EMAIL_VERIFICATION },
  });
});
