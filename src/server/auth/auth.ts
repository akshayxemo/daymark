import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { count, eq } from 'drizzle-orm';
import type { Env } from '@/server/config/env';
import type { DatabaseClient } from '@/server/db/client';
import { account, rateLimit, session, user, verification } from '@/server/db/schema';
import { describeError, logger } from '@/server/logging';
import { ensureUserSettings } from '@/server/modules/users/service';
import {
  changeEmailEmail,
  deleteAccountEmail,
  passwordResetEmail,
  verificationEmail,
  type Mailer,
} from './mail';
import {
  checkInvitation,
  consumeInvitation,
  getRegistrationPolicy,
  invitationHeader,
} from './registration';

export type CreateAuthOptions = {
  db: DatabaseClient;
  env: Env;
  mailer: Mailer;
};

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function trustedOrigins(env: Env): string[] {
  const origins = new Set<string>([env.appUrl]);
  if (env.VERCEL_URL) origins.add(`https://${env.VERCEL_URL}`);
  if (!env.isProduction) origins.add('http://localhost:3000');
  return [...origins];
}

function invitationMessage(reason: string): string {
  switch (reason) {
    case 'missing':
      return 'An invitation code is required to create an account on this Daymark installation.';
    case 'expired':
      return 'This invitation has expired. Ask the installation owner for a new one.';
    case 'used':
      return 'This invitation has already been used.';
    case 'email_mismatch':
      return 'This invitation was issued for a different email address.';
    default:
      return 'This invitation code is not valid.';
  }
}

/**
 * Builds the Better Auth instance. The database, environment and mail
 * transport are injected so the same configuration serves the Next.js
 * runtime, the seed script and the integration tests.
 */
export function createAuth({ db, env, mailer }: CreateAuthOptions) {
  return betterAuth({
    appName: 'Daymark',
    baseURL: env.appUrl,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(env),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification, rateLimit },
    }),
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'member', input: false },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user: current, newEmail, url }) => {
          await mailer.send(changeEmailEmail(current.email, newEmail, url));
        },
      },
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 60,
        sendDeleteAccountVerification: async ({ user: current, url }) => {
          await mailer.send(deleteAccountEmail(current.email, url));
        },
        afterDelete: async (deleted) => {
          // Every user-owned table cascades from user.id, so nothing else is needed.
          logger.info('Account deleted', { userId: deleted.id });
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
      autoSignIn: !env.REQUIRE_EMAIL_VERIFICATION,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: current, url }) => {
        await mailer.send(passwordResetEmail(current.email, url));
      },
    },
    emailVerification: {
      sendOnSignUp: env.REQUIRE_EMAIL_VERIFICATION,
      sendOnSignIn: env.REQUIRE_EMAIL_VERIFICATION,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user: current, url }) => {
        await mailer.send(verificationEmail(current.email, url));
      },
    },
    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 },
    },
    rateLimit: {
      enabled: !env.isTest,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/reset-password': { window: 60, max: 5 },
        '/send-verification-email': { window: 60, max: 3 },
        '/change-password': { window: 60, max: 5 },
        '/delete-user': { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: env.appUrl.startsWith('https://'),
      cookiePrefix: 'daymark',
      ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (created, context) => {
            try {
              await ensureUserSettings(db, created.id, env.DEFAULT_TIMEZONE);
              const [{ users }] = await db.select({ users: count() }).from(user);
              if (users === 1) {
                await db.update(user).set({ role: 'owner' }).where(eq(user.id, created.id));
              }
              const code = context?.headers?.get(invitationHeader);
              if (code) {
                const check = await checkInvitation(db, code, created.email);
                if (check.ok) await consumeInvitation(db, check.invitationId, created.id);
              }
            } catch (error) {
              logger.error('Post-registration setup failed', {
                userId: created.id,
                ...describeError(error),
              });
              throw error;
            }
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/sign-up/email') return;
        const policy = await getRegistrationPolicy(db, env);
        if (policy.open) return;
        if (policy.inviteOnly) {
          const body = (ctx.body ?? {}) as { email?: string };
          const check = await checkInvitation(
            db,
            ctx.headers?.get(invitationHeader),
            body.email ?? '',
          );
          if (check.ok) return;
          throw new APIError('FORBIDDEN', {
            code: 'INVITATION_REQUIRED',
            message: invitationMessage(check.reason),
          });
        }
        throw new APIError('FORBIDDEN', {
          code: 'REGISTRATION_DISABLED',
          message: 'Registration is closed on this Daymark installation.',
        });
      }),
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];
export type AuthUser = AuthSession['user'];

/** Name of the session cookie, used by the optimistic redirect in proxy.ts. */
export function sessionCookieName(secure: boolean): string {
  return `${secure ? '__Secure-' : ''}daymark.session_token`;
}
