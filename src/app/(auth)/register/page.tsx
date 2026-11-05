import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/forms';
import { getEnv } from '@/server/config/env';
import { getRegistrationPolicy } from '@/server/auth/registration';
import { getDatabase } from '@/server/db';

export const metadata: Metadata = { title: 'Create an account' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const env = getEnv();
  const policy = await getRegistrationPolicy(getDatabase(), env);
  return (
    <Suspense fallback={null}>
      <RegisterForm
        open={policy.open}
        inviteOnly={policy.inviteOnly}
        isFirstUser={policy.isFirstUser}
        requireVerification={env.REQUIRE_EMAIL_VERIFICATION}
      />
    </Suspense>
  );
}
