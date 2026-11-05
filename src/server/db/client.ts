import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type DatabaseClient = ReturnType<typeof createDatabase>['db'];
export type Transaction = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];
/** Either the root client or an open transaction. Services accept both. */
export type DbExecutor = DatabaseClient | Transaction;

export type CreateDatabaseOptions = {
  /**
   * Maximum connections for this process. Serverless runtimes should keep
   * this small (each instance opens its own pool); long-running servers can
   * raise it.
   */
  max?: number;
  /** Whether to use prepared statements. Must be false behind transaction poolers. */
  prepare?: boolean;
};

/**
 * Creates a Drizzle client over postgres.js. Used by the application runtime,
 * the migration/seed scripts and the integration tests, so it must not import
 * anything Next.js-specific.
 */
export function createDatabase(connectionString: string, options: CreateDatabaseOptions = {}) {
  const target = new URL(connectionString);
  const supabaseTransactionPooler =
    target.hostname.endsWith('.pooler.supabase.com') && target.port === '6543';
  const sql = postgres(connectionString, {
    max: options.max ?? 5,
    // Transaction-mode poolers (Supabase, PgBouncer) do not support named
    // prepared statements, so the unnamed statement is used everywhere.
    prepare: options.prepare ?? false,
    // Supavisor transaction pooling can stall when queries share a pipeline.
    // Keep parallel work on separate connections, with one query in flight per connection.
    max_pipeline: supabaseTransactionPooler ? 1 : 100,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
    onnotice: () => {},
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export { schema };
