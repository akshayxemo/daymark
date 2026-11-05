import nodemailer from 'nodemailer';
import type { Mailer, MailMessage } from './types';

export type SmtpOptions = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
};

/** Generic SMTP delivery for self-hosted installations. */
export function createSmtpMailer(options: SmtpOptions): Mailer {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.user ? { user: options.user, pass: options.password ?? '' } : undefined,
  });
  return {
    name: 'smtp',
    async send(message: MailMessage) {
      await transport.sendMail({
        from: options.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}
