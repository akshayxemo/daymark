import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

// Load .env files the same way Next.js does so `pnpm db:*` commands work
// without exporting variables manually.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
  dbCredentials: {
    // Migrations use the direct (unpooled) connection when one is configured.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
  },
});
