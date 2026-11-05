import { and, count, eq, isNull } from 'drizzle-orm';
import type { Env } from '@/server/config/env';
import type { DbExecutor } from '@/server/db/client';
import { invitations, user } from '@/server/db/schema';

export type RegistrationPolicy = {
  mode: Env['REGISTRATION_MODE'];
  deploymentMode: Env['DEPLOYMENT_MODE'];
  /** True when no account exists yet, so the installation can be set up. */
  isFirstUser: boolean;
  /** True when a visitor may register without an invitation. */
  open: boolean;
  /** True when registration is possible with a valid invitation code. */
  inviteOnly: boolean;
};

export async function getRegistrationPolicy(db: DbExecutor, env: Env): Promise<RegistrationPolicy> {
  const [{ users }] = await db.select({ users: count() }).from(user);
  const isFirstUser = users === 0;
  // The first account can always be created: it is how an installation is set up.
  if (isFirstUser) {
    return {
      mode: env.REGISTRATION_MODE,
      deploymentMode: env.DEPLOYMENT_MODE,
      isFirstUser,
      open: true,
      inviteOnly: false,
    };
  }
  if (env.DEPLOYMENT_MODE === 'single-user') {
    return {
      mode: 'disabled',
      deploymentMode: env.DEPLOYMENT_MODE,
      isFirstUser,
      open: false,
      inviteOnly: false,
    };
  }
  return {
    mode: env.REGISTRATION_MODE,
    deploymentMode: env.DEPLOYMENT_MODE,
    isFirstUser,
    open: env.REGISTRATION_MODE === 'open',
    inviteOnly: env.REGISTRATION_MODE === 'invite',
  };
}

export type InvitationCheck =
  | { ok: true; invitationId: string }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' | 'used' | 'email_mismatch' };

export async function checkInvitation(
  db: DbExecutor,
  code: string | null | undefined,
  email: string,
): Promise<InvitationCheck> {
  const normalized = code?.trim();
  if (!normalized) return { ok: false, reason: 'missing' };
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.code, normalized))
    .limit(1);
  if (!invitation) return { ok: false, reason: 'invalid' };
  if (invitation.usedAt) return { ok: false, reason: 'used' };
  if (invitation.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' };
  if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, reason: 'email_mismatch' };
  }
  return { ok: true, invitationId: invitation.id };
}

export async function consumeInvitation(db: DbExecutor, invitationId: string, userId: string) {
  await db
    .update(invitations)
    .set({ usedAt: new Date(), usedByUserId: userId })
    .where(and(eq(invitations.id, invitationId), isNull(invitations.usedAt)));
}

export const invitationHeader = 'x-daymark-invitation';
