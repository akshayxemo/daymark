import type { Env } from '@/server/config/env';
import { createConsoleMailer } from './console';
import { createResendMailer } from './resend';
import { createSmtpMailer } from './smtp';
import type { Mailer } from './types';

/** Builds the configured transactional email transport. */
export function createMailer(env: Env): Mailer {
  switch (env.emailProvider) {
    case 'resend':
      return createResendMailer({ apiKey: env.RESEND_API_KEY!, from: env.EMAIL_FROM! });
    case 'smtp':
      return createSmtpMailer({
        host: env.SMTP_HOST!,
        port: env.SMTP_PORT!,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.EMAIL_FROM!,
      });
    default:
      return createConsoleMailer();
  }
}

export type { Mailer, MailMessage } from './types';
export * from './templates';
