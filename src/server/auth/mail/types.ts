export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export interface Mailer {
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}
