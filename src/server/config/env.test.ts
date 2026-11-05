import { describe, expect, it } from 'vitest';
import { getEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  BETTER_AUTH_SECRET: 'x'.repeat(40),
} as unknown as NodeJS.ProcessEnv;

describe('environment validation', () => {
  it('applies development defaults', () => {
    const env = getEnv({ ...base, NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(env.appUrl).toBe('http://localhost:3000');
    expect(env.emailProvider).toBe('console');
    expect(env.REGISTRATION_MODE).toBe('open');
    expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(true);
    expect(env.migrationDatabaseUrl).toBe(base.DATABASE_URL);
  });
  it('prefers the unpooled URL for migrations', () => {
    const env = getEnv({
      ...base,
      DATABASE_URL_UNPOOLED: 'postgresql://direct/db',
    } as NodeJS.ProcessEnv);
    expect(env.migrationDatabaseUrl).toBe('postgresql://direct/db');
  });
  it('reports every missing required setting at once', () => {
    expect(() => getEnv({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrowError(
      /DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/,
    );
    expect(() => getEnv({ ...base, NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrowError(
      /EMAIL_PROVIDER/,
    );
  });
  it('refuses the console mail provider and missing keys in production', () => {
    expect(() =>
      getEnv({
        ...base,
        NODE_ENV: 'production',
        APP_URL: 'https://x.test',
        EMAIL_PROVIDER: 'console',
      } as NodeJS.ProcessEnv),
    ).toThrow(/not allowed in production/);
    expect(() =>
      getEnv({
        ...base,
        NODE_ENV: 'production',
        APP_URL: 'https://x.test',
        EMAIL_PROVIDER: 'resend',
        EMAIL_FROM: 'a@x.test',
      } as NodeJS.ProcessEnv),
    ).toThrow(/RESEND_API_KEY/);
  });
  it('accepts a complete production configuration and derives the Vercel origin', () => {
    const env = getEnv({
      ...base,
      NODE_ENV: 'production',
      VERCEL_URL: 'daymark-git-main.vercel.app',
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: 'Daymark <no-reply@x.test>',
      SMTP_HOST: 'smtp.x.test',
      SMTP_PORT: '587',
    } as NodeJS.ProcessEnv);
    expect(env.appUrl).toBe('https://daymark-git-main.vercel.app');
    expect(env.SMTP_PORT).toBe(587);
  });
  it('rejects a short auth secret', () => {
    expect(() => getEnv({ ...base, BETTER_AUTH_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow(
      /at least 32/,
    );
  });
});
