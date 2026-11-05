import type { Mailer, MailMessage } from './types';

/**
 * Development and test transport: prints the message to the server log so
 * verification and reset links can be copied from the terminal. The
 * environment validation refuses this provider in production.
 */
export function createConsoleMailer(sink: (line: string) => void = console.log): Mailer {
  return {
    name: 'console',
    async send(message: MailMessage) {
      sink(
        [
          '',
          '================ Daymark email (console provider) ================',
          `To:      ${message.to}`,
          `Subject: ${message.subject}`,
          '',
          message.text,
          '===================================================================',
          '',
        ].join('\n'),
      );
    },
  };
}
