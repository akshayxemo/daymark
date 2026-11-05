import 'server-only';
import { getEnv } from '@/server/config/env';
import { createDatabase, type DatabaseClient } from './client';

/**
 * Process-wide database singleton for the Next.js runtime. The client is
 * created lazily so that building the application never requires a database,
 * and it survives hot reloads in development through a global reference.
 */
const globalRef = globalThis as unknown as {
  __daymarkDatabase?: ReturnType<typeof createDatabase>;
};

export function getDatabase(): DatabaseClient {
  if (!globalRef.__daymarkDatabase) {
    const env = getEnv();
    globalRef.__daymarkDatabase = createDatabase(env.DATABASE_URL, {
      // Vercel functions are short-lived and many instances may run at once.
      max: env.VERCEL_ENV ? 2 : 10,
    });
  }
  return globalRef.__daymarkDatabase.db;
}

export * from './client';
