import { afterAll, beforeEach } from 'vitest';
import { loadTestEnv } from '../env';
import { closeTestDatabase, truncateAll } from './helpers';

loadTestEnv();

// Point the application configuration at the test database and a fixed secret
// before any module reads the environment.
Object.assign(process.env, { NODE_ENV: 'test' });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL_UNPOOLED = process.env.TEST_DATABASE_URL;
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || 'integration-test-secret-at-least-32-characters-long';
process.env.APP_URL = 'http://localhost:3000';
process.env.EMAIL_PROVIDER = 'console';
process.env.REGISTRATION_MODE = process.env.TEST_REGISTRATION_MODE || 'open';
process.env.DEPLOYMENT_MODE = 'multi-user';

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeTestDatabase();
});
