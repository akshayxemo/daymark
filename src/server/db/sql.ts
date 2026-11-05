import { getTableName, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ValidationError } from '@/server/http/errors';

const timezonePattern = /^[A-Za-z0-9_+\-/]{1,64}$/;

/**
 * Inlines an IANA timezone as a SQL literal. Parameters cannot be used here
 * because PostgreSQL treats `at time zone $1` in SELECT and GROUP BY as two
 * different expressions; a validated literal keeps both identical.
 */
export function timezoneLiteral(timezone: string): SQL {
  if (!timezonePattern.test(timezone)) {
    throw new ValidationError('Invalid timezone identifier.');
  }
  return sql.raw(`'${timezone}'`);
}

/** Calendar date (YYYY-MM-DD) of a timestamptz column in the given timezone. */
export function localDay(column: AnyPgColumn | SQL, timezone: string): SQL<string> {
  return sql<string>`to_char(${column} at time zone ${timezoneLiteral(timezone)}, 'YYYY-MM-DD')`;
}

/**
 * Fully qualified column reference ("table"."column"). Drizzle omits the
 * table name for single-table queries, which makes correlated subqueries
 * ambiguous or, worse, bind to the inner table. Use this for every column
 * that appears inside a raw subquery.
 */
export function q(column: AnyPgColumn): SQL {
  return sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
}
