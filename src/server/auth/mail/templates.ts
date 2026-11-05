import type { MailMessage } from './types';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title: string, lines: string[], action: { label: string; url: string }): string {
  const safeUrl = escapeHtml(action.url);
  return `<!doctype html><html><body style="margin:0;padding:32px;background:#f5f6f2;font-family:Arial,Helvetica,sans-serif;color:#242d24">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #dce2d8;border-radius:12px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">${escapeHtml(title)}</td></tr>
${lines.map((line) => `<tr><td style="font-size:14px;line-height:22px;padding-bottom:12px">${escapeHtml(line)}</td></tr>`).join('')}
<tr><td style="padding:12px 0 20px"><a href="${safeUrl}" style="display:inline-block;background:#42702d;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:8px">${escapeHtml(action.label)}</a></td></tr>
<tr><td style="font-size:12px;line-height:18px;color:#626d62">If the button does not work, copy this link into your browser:<br>${safeUrl}</td></tr>
<tr><td style="font-size:12px;line-height:18px;color:#626d62;padding-top:16px">If you did not request this, you can safely ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}

function textBody(lines: string[], action: { label: string; url: string }): string {
  return [
    ...lines,
    '',
    `${action.label}: ${action.url}`,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
}

export function verificationEmail(to: string, url: string): MailMessage {
  const lines = ['Welcome to Daymark.', 'Confirm your email address to activate your account.'];
  const action = { label: 'Verify my email', url };
  return {
    to,
    subject: 'Verify your Daymark email',
    text: textBody(lines, action),
    html: layout('Verify your email', lines, action),
  };
}

export function passwordResetEmail(to: string, url: string): MailMessage {
  const lines = [
    'We received a request to reset the password for your Daymark account.',
    'The link expires in one hour.',
  ];
  const action = { label: 'Reset my password', url };
  return {
    to,
    subject: 'Reset your Daymark password',
    text: textBody(lines, action),
    html: layout('Reset your password', lines, action),
  };
}

export function deleteAccountEmail(to: string, url: string): MailMessage {
  const lines = [
    'You asked to permanently delete your Daymark account.',
    'Confirming removes every workspace, task, time record and journal entry. This cannot be undone.',
  ];
  const action = { label: 'Confirm account deletion', url };
  return {
    to,
    subject: 'Confirm Daymark account deletion',
    text: textBody(lines, action),
    html: layout('Confirm account deletion', lines, action),
  };
}

export function changeEmailEmail(to: string, newEmail: string, url: string): MailMessage {
  const lines = [
    `A request was made to change the email on your Daymark account to ${newEmail}.`,
    'Approve the change with the link below.',
  ];
  const action = { label: 'Approve email change', url };
  return {
    to,
    subject: 'Approve your Daymark email change',
    text: textBody(lines, action),
    html: layout('Approve email change', lines, action),
  };
}
