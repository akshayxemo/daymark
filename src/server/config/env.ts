import { z } from 'zod';

/**
 * Server-side environment configuration.
 *
 * Every variable the application reads is declared here so that a missing or
 * malformed value fails fast with an actionable message instead of surfacing
 * as a confusing runtime error. Never import this module from client code:
 * it exposes secrets. Public values must be read through `NEXT_PUBLIC_*`.
 */

const trimmed = z.string().trim();
const optionalString = trimmed.optional().transform((v) => (v === '' ? undefined : v));
const booleanString = z
  .string()
  .trim()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const registrationModes = ['open', 'invite', 'disabled'] as const;
const deploymentModes = ['single-user', 'multi-user'] as const;
const emailProviders = ['resend', 'smtp', 'console'] as const;

export type RegistrationMode = (typeof registrationModes)[number];
export type DeploymentMode = (typeof deploymentModes)[number];
export type EmailProvider = (typeof emailProviders)[number];

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: optionalString,
    VERCEL_URL: optionalString,
    VERCEL_ENV: optionalString,

    DATABASE_URL: trimmed.min(1, 'DATABASE_URL is required (PostgreSQL connection string)'),
    DATABASE_URL_UNPOOLED: optionalString,

    BETTER_AUTH_SECRET: trimmed.min(
      32,
      'BETTER_AUTH_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32',
    ),

    REGISTRATION_MODE: z.enum(registrationModes).default('open'),
    DEPLOYMENT_MODE: z.enum(deploymentModes).default('multi-user'),
    DEFAULT_TIMEZONE: trimmed.default('UTC'),
    REQUIRE_EMAIL_VERIFICATION: trimmed
      .optional()
      .transform((v) => v === undefined || v === '' || !(v === 'false' || v === '0')),

    EMAIL_PROVIDER: z.enum(emailProviders).optional(),
    EMAIL_FROM: optionalString,
    RESEND_API_KEY: optionalString,
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: booleanString,

    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .superRefine((env, ctx) => {
    const production = env.NODE_ENV === 'production';
    const provider = env.EMAIL_PROVIDER ?? (production ? undefined : 'console');
    if (!provider) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVIDER'],
        message:
          'EMAIL_PROVIDER must be "resend" or "smtp" in production. Verification and password reset emails cannot be delivered otherwise.',
      });
      return;
    }
    if (provider === 'console' && production) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVIDER'],
        message: 'EMAIL_PROVIDER=console only logs emails and is not allowed in production.',
      });
    }
    if (provider !== 'console' && !env.EMAIL_FROM) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_FROM'],
        message:
          'EMAIL_FROM is required when EMAIL_PROVIDER is set (e.g. "Daymark <no-reply@example.com>").',
      });
    }
    if (provider === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when EMAIL_PROVIDER=resend.',
      });
    }
    if (provider === 'smtp' && (!env.SMTP_HOST || !env.SMTP_PORT)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST and SMTP_PORT are required when EMAIL_PROVIDER=smtp.',
      });
    }
    if (production && !env.APP_URL && !env.VERCEL_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message:
          'APP_URL is required in production (the public origin, e.g. https://daymark.example.com).',
      });
    }
    if (env.APP_URL && !/^https?:\/\//.test(env.APP_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'APP_URL must be an absolute origin starting with http:// or https://.',
      });
    }
  });

export type Env = z.infer<typeof schema> & {
  /** Resolved public origin without a trailing slash. */
  appUrl: string;
  /** Resolved email provider ("console" in development and test by default). */
  emailProvider: EmailProvider;
  /** Connection string used for migrations (direct connection when available). */
  migrationDatabaseUrl: string;
  isProduction: boolean;
  isTest: boolean;
};

function resolveAppUrl(env: z.infer<typeof schema>): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, '');
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

let cached: Env | undefined;

/**
 * Parses and caches the environment. Throws a readable error listing every
 * problem at once so a deployment can be fixed in one pass.
 */
export function getEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached && source === process.env) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(parsed.error)}\n\nSee .env.example and docs/DEPLOYMENT.md for the full variable reference.`,
    );
  }
  const env: Env = {
    ...parsed.data,
    appUrl: resolveAppUrl(parsed.data),
    emailProvider: parsed.data.EMAIL_PROVIDER ?? 'console',
    migrationDatabaseUrl: parsed.data.DATABASE_URL_UNPOOLED ?? parsed.data.DATABASE_URL,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
  };
  if (source === process.env) cached = env;
  return env;
}

/** Test helper: clears the cached environment so a new `process.env` is read. */
export function resetEnvCache() {
  cached = undefined;
}
