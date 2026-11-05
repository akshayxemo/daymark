import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Verify your email' };

/** Informational page shown after registration when verification is required. */
export default function VerifyEmailPage() {
  return (
    <div className="task-form auth-form">
      <h1>Verify your email</h1>
      <p>
        Open the verification link we emailed you to activate your account. If it has expired, sign
        in and request a new one.
      </p>
      <div className="form-actions">
        <Button asChild variant="outline">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
