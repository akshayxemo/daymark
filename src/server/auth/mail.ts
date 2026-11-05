import 'server-only';
import type { AuthMail } from './index';

export async function sendAuthMail(message: AuthMail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!key || !from) throw new Error('RESEND_API_KEY and AUTH_EMAIL_FROM are required');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new Error(`Authentication email delivery failed (${response.status})`);
}
