import type { DbExecutor, Transaction } from './client';

/**
 * Runs `fn` inside a transaction. When the executor is already a transaction
 * Drizzle opens a savepoint, so services can compose freely.
 */
export function withTransaction<T>(
  db: DbExecutor,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}
