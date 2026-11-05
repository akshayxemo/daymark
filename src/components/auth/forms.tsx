'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
} from '@/lib/validation/auth';
import type { z } from 'zod';

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

/** Only allow same-origin relative paths as post-login destinations. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/app';
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<string | null>(
    params.get('error')
      ? 'That link is invalid or has expired. Please sign in or request a new one.'
      : null,
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const form = useForm<z.input<typeof loginSchema>, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    setUnverifiedEmail(null);
    const result = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
    });
    if (result.error) {
      if (result.error.status === 403) setUnverifiedEmail(values.email);
      else if (result.error.status === 429)
        setError('Too many attempts. Please wait a minute and try again.');
      else if (result.error.status >= 500)
        setError('The server could not complete the sign-in. Please try again later.');
      else setError('That email and password combination was not recognised.');
      return;
    }
    startNavigation(() => router.replace(next));
  });

  const resend = async () => {
    if (!unverifiedEmail) return;
    await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: '/app' });
    setResent(true);
  };

  return (
    <form className="task-form auth-form" onSubmit={submit} noValidate>
      <h1>Welcome back</h1>
      <p>Sign in to pick up where you left off.</p>
      <label>
        Email
        <input type="email" autoComplete="email" autoFocus {...form.register('email')} />
        <FieldError message={form.formState.errors.email?.message} />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" {...form.register('password')} />
        <FieldError message={form.formState.errors.password?.message} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" {...form.register('rememberMe')} />
        Keep me signed in on this device
      </label>
      {error && (
        <p className="project-error" role="alert">
          {error}
        </p>
      )}
      {unverifiedEmail && (
        <p className="project-error" role="alert">
          Verify your email before signing in. Check your inbox for the link
          {resent ? '. A new link has been sent.' : ' or '}
          {!resent && (
            <button type="button" className="text-link inline-link" onClick={resend}>
              send it again
            </button>
          )}
          .
        </p>
      )}
      <div className="form-actions">
        <Link className="text-link" href="/forgot-password">
          Forgot your password?
        </Link>
        <Button type="submit" disabled={form.formState.isSubmitting || isNavigating}>
          {form.formState.isSubmitting || isNavigating ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
      <p className="auth-switch">
        New to Daymark? <Link href="/register">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm({
  open,
  inviteOnly,
  isFirstUser,
  requireVerification,
}: {
  open: boolean;
  inviteOnly: boolean;
  isFirstUser: boolean;
  requireVerification: boolean;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      invitationCode: params.get('invite') ?? '',
    },
  });

  if (!open && !inviteOnly) {
    return (
      <div className="task-form auth-form">
        <h1>Registration is closed</h1>
        <p>
          This Daymark installation is not accepting new accounts. If you already have one, sign in
          instead.
        </p>
        <div className="form-actions">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="task-form auth-form">
        <h1>Check your inbox</h1>
        <p>
          We sent a verification link to <strong>{done}</strong>. Open it to activate your account;
          the link is valid for 24 hours.
        </p>
        <div className="form-actions">
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: '/onboarding',
      fetchOptions: values.invitationCode
        ? { headers: { 'x-daymark-invitation': values.invitationCode } }
        : undefined,
    });
    if (result.error) {
      setError(
        result.error.message ||
          (result.error.status === 422
            ? 'An account with this email already exists.'
            : 'We could not create the account.'),
      );
      return;
    }
    if (requireVerification) {
      setDone(values.email);
      return;
    }
    startNavigation(() => router.replace('/onboarding'));
  });

  return (
    <form className="task-form auth-form" onSubmit={submit} noValidate>
      <h1>{isFirstUser ? 'Set up Daymark' : 'Create your account'}</h1>
      <p>
        {isFirstUser
          ? 'You are creating the first account on this installation. It becomes the owner account.'
          : 'Your workspaces, tasks and time stay private to you.'}
      </p>
      <label>
        Name
        <input autoComplete="name" autoFocus {...form.register('name')} />
        <FieldError message={form.formState.errors.name?.message} />
      </label>
      <label>
        Email
        <input type="email" autoComplete="email" {...form.register('email')} />
        <FieldError message={form.formState.errors.email?.message} />
      </label>
      <label>
        Password
        <input type="password" autoComplete="new-password" {...form.register('password')} />
        <FieldError message={form.formState.errors.password?.message} />
        <small className="field-hint">At least 10 characters. A passphrase works well.</small>
      </label>
      {inviteOnly && !isFirstUser && (
        <label>
          Invitation code
          <input autoComplete="off" {...form.register('invitationCode')} />
          <small className="field-hint">
            This installation is invite-only. Ask the owner for a code.
          </small>
        </label>
      )}
      {error && (
        <p className="project-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={form.formState.isSubmitting || isNavigating}>
          {form.formState.isSubmitting || isNavigating ? 'Creating…' : 'Create account'}
        </Button>
      </div>
      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
      <p className="auth-legal">
        By continuing you agree to the <Link href="/terms">terms</Link> and{' '}
        <Link href="/privacy">privacy policy</Link> of this installation.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const submit = form.handleSubmit(async (values) => {
    await authClient.requestPasswordReset({ email: values.email, redirectTo: '/reset-password' });
    setSent(true);
  });
  if (sent) {
    return (
      <div className="task-form auth-form">
        <h1>Check your inbox</h1>
        <p>
          If an account exists for that address, a password reset link is on its way. It expires in
          one hour.
        </p>
        <div className="form-actions">
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <form className="task-form auth-form" onSubmit={submit} noValidate>
      <h1>Reset your password</h1>
      <p>Enter your email and we will send you a link to choose a new password.</p>
      <label>
        Email
        <input type="email" autoComplete="email" autoFocus {...form.register('email')} />
        <FieldError message={form.formState.errors.email?.message} />
      </label>
      <div className="form-actions">
        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Send reset link
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [error, setError] = useState<string | null>(
    params.get('error') ? 'This reset link is invalid or has expired. Request a new one.' : null,
  );
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  if (!token) {
    return (
      <div className="task-form auth-form">
        <h1>Link missing</h1>
        <p>Open the reset link from your email, or request a new one.</p>
        <div className="form-actions">
          <Button asChild variant="outline">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    );
  }
  const submit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await authClient.resetPassword({ newPassword: values.password, token });
    if (result.error) {
      setError('This reset link is invalid or has expired. Request a new one.');
      return;
    }
    router.push('/login?reset=1');
  });
  return (
    <form className="task-form auth-form" onSubmit={submit} noValidate>
      <h1>Choose a new password</h1>
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          autoFocus
          {...form.register('password')}
        />
        <FieldError message={form.formState.errors.password?.message} />
      </label>
      <label>
        Confirm password
        <input type="password" autoComplete="new-password" {...form.register('confirm')} />
        <FieldError message={form.formState.errors.confirm?.message} />
      </label>
      {error && (
        <p className="project-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save new password
        </Button>
      </div>
    </form>
  );
}
