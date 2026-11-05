import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDatabase } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Liveness and database connectivity check used by Docker and uptime monitors. */
export async function GET() {
  let database: 'ok' | 'error' = 'ok';
  try {
    await getDatabase().execute(sql`select 1`);
  } catch {
    database = 'error';
  }
  return NextResponse.json(
    { status: database === 'ok' ? 'ok' : 'degraded', database, time: new Date().toISOString() },
    { status: database === 'ok' ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
