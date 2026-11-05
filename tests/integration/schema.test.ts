import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { testDb } from './helpers';

describe('database schema guarantees', () => {
  it('has row-level security enabled on every public table (Data API lockdown)', async () => {
    const rows = await testDb().execute<{ tablename: string; rowsecurity: boolean }>(
      sql`select tablename, rowsecurity from pg_tables where schemaname = 'public'`,
    );
    const missing = [...rows].filter((row) => !row.rowsecurity).map((row) => row.tablename);
    expect(
      missing,
      'New tables need RLS: add them to a migration like 0001_lock_down_data_api.sql',
    ).toEqual([]);
  });

  it('enforces one active timer per user with a partial unique index', async () => {
    const rows = await testDb().execute<{ indexdef: string }>(
      sql`select indexdef from pg_indexes where indexname = 'work_sessions_one_active_per_user'`,
    );
    expect([...rows][0]?.indexdef).toMatch(
      /UNIQUE INDEX[\s\S]*\(user_id\)[\s\S]*WHERE[\s\S]*running[\s\S]*paused/,
    );
  });

  it('stores every timestamp as timestamptz', async () => {
    const rows = await testDb().execute<{ table_name: string; column_name: string }>(sql`
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and data_type = 'timestamp without time zone'`);
    expect([...rows]).toEqual([]);
  });
});
