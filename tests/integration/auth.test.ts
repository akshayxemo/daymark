import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  session as sessionTable,
  user,
  userSettings,
  workspaces,
} from '../../src/server/db/schema';
import { resetEnvCache } from '../../src/server/config/env';
import { invitationHeader } from '../../src/server/auth/registration';
import { createInvitation } from '../../src/server/modules/users/service';
import { createWorkspace } from '../../src/server/modules/workspaces/service';
import { createCapturingMailer, createTestAuth, firstLink, testDb } from './helpers';

const password = 'correct-horse-battery-staple';

/** Better Auth links carry the token either as `?token=` or as the last path segment. */
function tokenFrom(url: string): string {
  const parsed = new URL(url);
  const token =
    parsed.searchParams.get('token') ?? parsed.pathname.split('/').filter(Boolean).pop();
  if (!token) throw new Error(`No token in ${url}`);
  return token;
}

function withMode(
  mode: 'open' | 'invite' | 'disabled',
  deployment: 'single-user' | 'multi-user' = 'multi-user',
) {
  process.env.REGISTRATION_MODE = mode;
  process.env.DEPLOYMENT_MODE = deployment;
  resetEnvCache();
}

describe('authentication', () => {
  it('registers, requires email verification, then signs in with a database session', async () => {
    withMode('open');
    const mailer = createCapturingMailer();
    const auth = createTestAuth(mailer);
    const signedUp = await auth.api.signUpEmail({
      body: { name: 'Ada', email: 'ada@example.test', password },
      headers: new Headers(),
    });
    expect(signedUp.user.email).toBe('ada@example.test');
    expect(mailer.messages.map((m) => m.subject)).toEqual(['Verify your Daymark email']);
    const [settings] = await testDb()
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, signedUp.user.id));
    expect(settings?.timezone).toBe('UTC');
    const [row] = await testDb()
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, signedUp.user.id));
    expect(row?.role).toBe('owner');

    await expect(
      auth.api.signInEmail({
        body: { email: 'ada@example.test', password },
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 'FORBIDDEN' });

    const token = tokenFrom(firstLink(mailer.messages[0]!));
    await auth.api.verifyEmail({ query: { token }, headers: new Headers() });

    const signedIn = await auth.api.signInEmail({
      body: { email: 'ada@example.test', password },
      headers: new Headers(),
      returnHeaders: true,
    });
    const cookie = signedIn.headers.get('set-cookie');
    expect(cookie).toContain('daymark.session_token');
    const sessions = await testDb()
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.userId, signedUp.user.id));
    expect(sessions.length).toBeGreaterThan(0);

    const current = await auth.api.getSession({ headers: new Headers({ cookie: cookie! }) });
    expect(current?.user.id).toBe(signedUp.user.id);

    const second = await auth.api.signUpEmail({
      body: { name: 'Bob', email: 'bob@example.test', password },
      headers: new Headers(),
    });
    const [bob] = await testDb()
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, second.user.id));
    expect(bob?.role).toBe('member');
  });

  it('rejects invalid, expired and signed-out sessions', async () => {
    withMode('open');
    const auth = createTestAuth();
    const none = await auth.api.getSession({
      headers: new Headers({ cookie: 'daymark.session_token=not-a-real-token' }),
    });
    expect(none).toBeNull();

    await auth.api.signUpEmail({
      body: { name: 'Eve', email: 'eve@example.test', password },
      headers: new Headers(),
    });
    const [created] = await testDb().select().from(user).where(eq(user.email, 'eve@example.test'));
    await testDb().update(user).set({ emailVerified: true }).where(eq(user.id, created!.id));
    const signedIn = await auth.api.signInEmail({
      body: { email: 'eve@example.test', password },
      headers: new Headers(),
      returnHeaders: true,
    });
    const cookie = signedIn.headers.get('set-cookie')!;
    await testDb()
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessionTable.userId, created!.id));
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
  });

  it('closes registration after the first account when disabled or single-user', async () => {
    withMode('disabled');
    const auth = createTestAuth();
    await auth.api.signUpEmail({
      body: { name: 'Owner', email: 'owner@example.test', password },
      headers: new Headers(),
    });
    await expect(
      auth.api.signUpEmail({
        body: { name: 'Second', email: 'second@example.test', password },
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 'FORBIDDEN' });

    withMode('open', 'single-user');
    const single = createTestAuth();
    await expect(
      single.api.signUpEmail({
        body: { name: 'Third', email: 'third@example.test', password },
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 'FORBIDDEN' });
  });

  it('allows invite-only registration with a valid, unused invitation', async () => {
    withMode('invite');
    const auth = createTestAuth();
    const owner = await auth.api.signUpEmail({
      body: { name: 'Owner', email: 'owner@example.test', password },
      headers: new Headers(),
    });
    const invitation = await createInvitation(testDb(), owner.user.id, {
      email: 'guest@example.test',
      expiresInDays: 7,
    });

    await expect(
      auth.api.signUpEmail({
        body: { name: 'Guest', email: 'guest@example.test', password },
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 'FORBIDDEN' });
    await expect(
      auth.api.signUpEmail({
        body: { name: 'Other', email: 'other@example.test', password },
        headers: new Headers({ [invitationHeader]: invitation.code }),
      }),
    ).rejects.toMatchObject({ status: 'FORBIDDEN' });

    const guest = await auth.api.signUpEmail({
      body: { name: 'Guest', email: 'guest@example.test', password },
      headers: new Headers({ [invitationHeader]: invitation.code }),
    });
    expect(guest.user.email).toBe('guest@example.test');
    await expect(
      auth.api.signUpEmail({
        body: { name: 'Again', email: 'guest2@example.test', password },
        headers: new Headers({ [invitationHeader]: invitation.code }),
      }),
    ).rejects.toMatchObject({ status: 'FORBIDDEN' });
  });

  it('resets a forgotten password through an emailed token and revokes old sessions', async () => {
    withMode('open');
    const mailer = createCapturingMailer();
    const auth = createTestAuth(mailer);
    await auth.api.signUpEmail({
      body: { name: 'Pat', email: 'pat@example.test', password },
      headers: new Headers(),
    });
    const [created] = await testDb().select().from(user).where(eq(user.email, 'pat@example.test'));
    await testDb().update(user).set({ emailVerified: true }).where(eq(user.id, created!.id));
    const signedIn = await auth.api.signInEmail({
      body: { email: 'pat@example.test', password },
      headers: new Headers(),
      returnHeaders: true,
    });
    const oldCookie = signedIn.headers.get('set-cookie')!;

    await auth.api.requestPasswordReset({
      body: { email: 'pat@example.test', redirectTo: '/reset-password' },
      headers: new Headers(),
    });
    const resetMail = mailer.messages.find((m) => m.subject.includes('Reset'));
    expect(resetMail).toBeDefined();
    const token = tokenFrom(firstLink(resetMail!));
    const newPassword = 'another-long-password-123';
    await auth.api.resetPassword({ body: { newPassword, token }, headers: new Headers() });

    await expect(
      auth.api.signInEmail({
        body: { email: 'pat@example.test', password },
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 'UNAUTHORIZED' });
    const again = await auth.api.signInEmail({
      body: { email: 'pat@example.test', password: newPassword },
      headers: new Headers(),
    });
    expect(again.user.id).toBe(created!.id);
    expect(await auth.api.getSession({ headers: new Headers({ cookie: oldCookie }) })).toBeNull();
  });

  it('deletes an account only after email confirmation and cascades its data', async () => {
    withMode('open');
    const mailer = createCapturingMailer();
    const auth = createTestAuth(mailer);
    const created = await auth.api.signUpEmail({
      body: { name: 'Quinn', email: 'quinn@example.test', password },
      headers: new Headers(),
    });
    await testDb().update(user).set({ emailVerified: true }).where(eq(user.id, created.user.id));
    await createWorkspace(testDb(), created.user.id, {
      name: 'Office',
      description: '',
      kind: 'professional',
      icon: 'briefcase',
      color: 'accent',
    });
    const signedIn = await auth.api.signInEmail({
      body: { email: 'quinn@example.test', password },
      headers: new Headers(),
      returnHeaders: true,
    });
    const cookie = signedIn.headers.get('set-cookie')!;

    await auth.api.deleteUser({
      body: { password, callbackURL: '/' },
      headers: new Headers({ cookie }),
    });
    expect(await testDb().select().from(user).where(eq(user.id, created.user.id))).toHaveLength(1);
    const confirmation = mailer.messages.find((m) => m.subject.includes('deletion'));
    expect(confirmation).toBeDefined();
    const token = tokenFrom(firstLink(confirmation!));
    // The callback answers with a redirect to callbackURL once the account is gone.
    const response = await auth.api.deleteUserCallback({
      query: { token, callbackURL: '/' },
      headers: new Headers({ cookie }),
      asResponse: true,
    });
    expect([200, 302]).toContain(response.status);

    expect(await testDb().select().from(user).where(eq(user.id, created.user.id))).toHaveLength(0);
    expect(
      await testDb().select().from(workspaces).where(eq(workspaces.userId, created.user.id)),
    ).toHaveLength(0);
    expect(
      await testDb().select().from(userSettings).where(eq(userSettings.userId, created.user.id)),
    ).toHaveLength(0);
  });
});
