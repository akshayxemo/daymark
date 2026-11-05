import 'server-only';
import { getEnv } from '@/server/config/env';
import { getDatabase } from '@/server/db';
import { createAuth, type Auth } from './auth';
import { createMailer } from './mail';

const globalRef = globalThis as unknown as { __daymarkAuth?: Auth };

/** Lazily constructed Better Auth singleton for the Next.js runtime. */
export function getAuth(): Auth {
  if (!globalRef.__daymarkAuth) {
    const env = getEnv();
    globalRef.__daymarkAuth = createAuth({ db: getDatabase(), env, mailer: createMailer(env) });
  }
  return globalRef.__daymarkAuth;
}

export type { Auth, AuthSession, AuthUser } from './auth';
