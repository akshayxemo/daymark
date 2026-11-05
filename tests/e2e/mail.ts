/** Minimal client for the Mailpit HTTP API used as the test inbox. */
const api = process.env.E2E_MAILPIT_URL || 'http://127.0.0.1:8025';

type Summary = { ID: string; Subject: string; To: { Address: string }[]; Created: string };

export async function clearMailbox() {
  const response = await fetch(`${api}/api/v1/messages`, { method: 'DELETE' }).catch(() => null);
  if (!response?.ok) {
    throw new Error(
      `Mailpit is not reachable at ${api}. Start it with: docker compose --profile mail up -d mailpit`,
    );
  }
}

/** Waits for the newest email to `to` whose subject contains `subject` and returns its first link. */
export async function waitForLink(
  to: string,
  subject: string,
  timeoutMs = 20_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${api}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages = [] } = (await search.json()) as { messages?: Summary[] };
    const match = messages.find((m) => m.Subject.includes(subject));
    if (match) {
      const message = (await (await fetch(`${api}/api/v1/message/${match.ID}`)).json()) as {
        Text: string;
      };
      const link = message.Text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No "${subject}" email arrived for ${to}.`);
}
