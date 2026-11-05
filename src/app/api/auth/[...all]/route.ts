import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/server/auth';

export const dynamic = 'force-dynamic';

const handler = toNextJsHandler((request) => getAuth().handler(request));

export const { GET, POST } = handler;
