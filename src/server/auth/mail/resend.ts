import type { Mailer, MailMessage } from './types';

/** Resend transactional email over its HTTP API (no SDK dependency needed). */
export function createResendMailer(options: { apiKey: string; from: string }): Mailer {
  return {
    name: 'resend',
    async send(message: MailMessage) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
      if (!response.ok) {
        // Resend returns a JSON body; only the status is surfaced to avoid logging content.
        throw new Error(`Resend rejected the email (HTTP ${response.status}).`);
      }
    },
  };
}
