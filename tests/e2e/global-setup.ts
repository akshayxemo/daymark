import resetDatabase from '../integration/global-setup';
import { clearMailbox } from './mail';

/** Fresh schema from migrations and an empty mailbox before every run. */
export default async function globalSetup() {
  await resetDatabase();
  await clearMailbox();
}
