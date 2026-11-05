import 'server-only';
import { createAuth } from './index';
import { sendAuthMail } from './mail';

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth(sendAuthMail));
}
