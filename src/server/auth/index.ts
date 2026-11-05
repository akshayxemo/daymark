import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDatabase } from '@/server/db';
import * as schema from '@/server/db/schema';

export type AuthMail = { to: string; subject: string; text: string };
export type SendAuthMail = (message: AuthMail) => Promise<void>;

// The mail implementation is injected so deploying Daymark does not require
// a particular email vendor. Do not mount public auth routes until a working
// mail provider and the remaining account isolation checks are in place.
export function createAuth(sendMail: SendAuthMail) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  if (!baseURL) throw new Error('BETTER_AUTH_URL is required');
  return betterAuth({
    secret,
    baseURL,
    database: drizzleAdapter(getDatabase(), { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({ to: user.email, subject: 'Reset your Daymark password', text: `Reset your password: ${url}` });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail({ to: user.email, subject: 'Verify your Daymark email', text: `Verify your email: ${url}` });
      },
    },
  });
}
