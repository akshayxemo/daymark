import { defineConfig, devices } from '@playwright/test';
import { loadTestEnv } from './tests/env';

loadTestEnv();

const port = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error('TEST_DATABASE_URL must be set for end-to-end tests (see .env.example).');

/**
 * End-to-end tests run the production build against the test database and a
 * local Mailpit SMTP server (`docker compose --profile mail up -d mailpit`),
 * so registration, verification emails and password flows are exercised for real.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: {
    // Calls the local Next.js binary directly so it works whichever package manager is on PATH.
    command: process.env.E2E_SKIP_BUILD
      ? `npx next start -p ${port}`
      : `npx next build && npx next start -p ${port}`,
    url: `${baseURL}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: databaseUrl,
      DATABASE_URL_UNPOOLED: databaseUrl,
      APP_URL: baseURL,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET || 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: 'Daymark <no-reply@daymark.test>',
      SMTP_HOST: process.env.E2E_SMTP_HOST || '127.0.0.1',
      SMTP_PORT: process.env.E2E_SMTP_PORT || '1025',
      SMTP_SECURE: 'false',
      REGISTRATION_MODE: 'open',
      DEPLOYMENT_MODE: 'multi-user',
      REQUIRE_EMAIL_VERIFICATION: 'true',
      LOG_LEVEL: 'warn',
    },
  },
});
