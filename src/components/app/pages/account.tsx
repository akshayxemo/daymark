'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useApiMutation, useInvitations, useMe } from '@/lib/api/queries';
import { authClient } from '@/lib/auth-client';
import { changePasswordSchema, deleteAccountSchema, emailSchema } from '@/lib/validation/auth';
import { useApp } from '../context';
import { ErrorNote, LoadingRows, SectionHead } from '../shared';
import { SettingsNav } from './settings';

export function AccountPage() {
  const me = useMe();
  if (!me.data) return <LoadingRows rows={6} />;
  return (
    <div className="page-stack">
      <SettingsNav />
      <Profile
        name={me.data.user.name}
        email={me.data.user.email}
        verified={me.data.user.emailVerified}
      />
      <ChangePassword />
      <Sessions />
      {me.data.user.isOwner && me.data.registration.mode === 'invite' && <Invitations />}
      {me.data.user.isOwner && (
        <section className="card">
          <SectionHead
            title="Installation"
            subtitle="You are the owner of this Daymark installation."
          />
          <p className="detail-hint">
            Deployment mode: <strong>{me.data.registration.deploymentMode}</strong> · registration:{' '}
            <strong>{me.data.registration.mode}</strong> · email provider:{' '}
            <strong>{me.data.email.provider}</strong>. These are set through environment variables.
          </p>
        </section>
      )}
      <DeleteAccount />
    </div>
  );
}

function Profile({ name, email, verified }: { name: string; email: string; verified: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveName = async () => {
    setError(null);
    const result = await authClient.updateUser({ name: value.trim() });
    if (result.error) setError(result.error.message ?? 'Could not update your name.');
    else {
      app.toast('Name updated');
      router.refresh();
    }
  };
  const changeEmail = async () => {
    setError(null);
    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) return setError('Enter a valid email address.');
    const result = await authClient.changeEmail({
      newEmail: parsed.data,
      callbackURL: '/app/settings/account',
    });
    if (result.error) setError(result.error.message ?? 'Could not start the email change.');
    else
      setMessage(verified ? 'Check your current inbox to approve the change.' : 'Email updated.');
  };
  return (
    <section className="card settings-card">
      <SectionHead
        title="Profile"
        subtitle={`${email}${verified ? ' · verified' : ' · not verified'}`}
      />
      <div className="setting-row">
        <div>
          <h3>Name</h3>
          <p>Shown in the sidebar and greetings.</p>
        </div>
        <div className="inline-form">
          <input
            value={value}
            maxLength={80}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Name"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={saveName}
            disabled={!value.trim() || value === name}
          >
            Save
          </Button>
        </div>
      </div>
      <div className="setting-row">
        <div>
          <h3>Email address</h3>
          <p>We confirm the change with your current address first.</p>
        </div>
        <div className="inline-form">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            aria-label="New email"
          />
          <Button size="sm" variant="outline" onClick={changeEmail} disabled={!newEmail}>
            Change
          </Button>
        </div>
      </div>
      {message && <p className="detail-hint">{message}</p>}
      {error && (
        <p className="project-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ChangePassword() {
  const app = useApp();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the form.');
    const result = await authClient.changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      revokeOtherSessions: true,
    });
    if (result.error)
      setError(
        result.error.status === 400
          ? 'Your current password is not correct.'
          : (result.error.message ?? 'Could not change the password.'),
      );
    else {
      setValues({ currentPassword: '', newPassword: '', confirm: '' });
      app.toast('Password changed. Other devices were signed out.');
    }
  };
  return (
    <section className="card">
      <SectionHead title="Password" subtitle="Changing it signs you out everywhere else." />
      <form className="task-form" onSubmit={submit}>
        <div className="form-grid">
          {(
            [
              ['currentPassword', 'Current password', 'current-password'],
              ['newPassword', 'New password', 'new-password'],
              ['confirm', 'Confirm new password', 'new-password'],
            ] as const
          ).map(([key, label, autoComplete]) => (
            <label key={key}>
              {label}
              <input
                type="password"
                autoComplete={autoComplete}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        {error && (
          <p className="project-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="submit" size="sm">
            Change password
          </Button>
        </div>
      </form>
    </section>
  );
}

type SessionRow = {
  id: string;
  token: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};

function Sessions() {
  const app = useApp();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const current = authClient.useSession();
  if (sessions === null) {
    authClient
      .listSessions()
      .then((result) => setSessions((result.data as SessionRow[] | null) ?? []));
  }
  const revokeOthers = async () => {
    await authClient.revokeOtherSessions();
    app.toast('Signed out on other devices');
    setSessions(null);
  };
  const signOut = async () => {
    await authClient.signOut();
    router.push('/login');
  };
  return (
    <section className="card">
      <SectionHead
        title="Signed-in devices"
        subtitle="Sessions are stored in the database and expire after 30 days of inactivity."
        action={
          <div className="inline-form">
            <Button size="sm" variant="outline" onClick={revokeOthers}>
              Sign out other devices
            </Button>
            <Button size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        }
      />
      {sessions === null && <LoadingRows rows={2} />}
      {(sessions ?? []).map((session) => (
        <div className="subtask-row" key={session.id}>
          <span className="session-label">
            {session.userAgent ? session.userAgent.slice(0, 80) : 'Unknown device'}
            <small>
              Last active {new Date(session.updatedAt).toLocaleString()}
              {current.data?.session.id === session.id ? ' · this device' : ''}
            </small>
          </span>
        </div>
      ))}
    </section>
  );
}

function Invitations() {
  const app = useApp();
  const invitations = useInvitations(true);
  const [email, setEmail] = useState('');
  const create = useApiMutation(
    () => api.post('/invitations', { email: email || undefined, expiresInDays: 14 }),
    'invitations',
    {
      onSuccess: () => {
        setEmail('');
        app.toast('Invitation created');
      },
    },
  );
  const revoke = useApiMutation((id: string) => api.delete(`/invitations/${id}`), 'invitations');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <section className="card">
      <SectionHead
        title="Invitations"
        subtitle="Registration is invite-only. Share a link; each code works once and expires after 14 days."
      />
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(undefined);
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Restrict to an email (optional)"
          aria-label="Invitation email"
        />
        <Button type="submit" size="sm" variant="outline">
          Create invitation
        </Button>
      </form>
      {(invitations.data ?? []).map((inv) => (
        <div className="subtask-row" key={inv.id}>
          <span className="session-label">
            <code>{`${origin}/register?invite=${inv.code}`}</code>
            <small>
              {inv.email ?? 'Any email'} ·{' '}
              {inv.usedAt ? 'used' : `expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
            </small>
          </span>
          {!inv.usedAt && (
            <Button size="sm" variant="ghost" onClick={() => revoke.mutate(inv.id)}>
              Revoke
            </Button>
          )}
        </div>
      ))}
      <ErrorNote error={create.error ?? revoke.error} />
    </section>
  );
}

function DeleteAccount() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = deleteAccountSchema.safeParse({ password, confirmation });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the form.');
    const result = await authClient.deleteUser({ password, callbackURL: '/' });
    if (result.error)
      setError(
        result.error.status === 400
          ? 'That password is not correct.'
          : (result.error.message ?? 'Could not start account deletion.'),
      );
    else setSent(true);
  };
  return (
    <section className="card danger-zone">
      <SectionHead
        title="Delete account"
        subtitle="Permanently removes every workspace, task, time record, journal entry and your login. Export your data first."
      />
      {sent ? (
        <p className="detail-hint">
          We emailed you a confirmation link. Your account is deleted only after you open it. The
          link is valid for one hour.
        </p>
      ) : (
        <form className="task-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Type DELETE to confirm
              <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </label>
          </div>
          {error && (
            <p className="project-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" variant="outline">
              Email me a confirmation link
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
