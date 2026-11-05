import { randomBytes } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { DbExecutor } from '@/server/db/client';
import { invitations, user, userSettings, type DashboardPreferences } from '@/server/db/schema';
import { ForbiddenError, NotFoundError } from '@/server/http/errors';

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (zone) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Unknown timezone. Use an IANA name such as Europe/Berlin or Asia/Kolkata.' },
  );

export const updateSettingsSchema = z.object({
  timezone: timezoneSchema.optional(),
  dateFormat: z.enum(['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd MMM yyyy']).optional(),
  timeFormat: z.enum(['24h', '12h']).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  defaultWorkspaceId: z.uuid().nullable().optional(),
  dashboard: z
    .object({
      hiddenWidgets: z.array(z.string().max(60)).max(30).optional(),
      period: z.enum(['today', 'week', 'month']).optional(),
      workspaceFilter: z.string().max(60).optional(),
    })
    .optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export async function ensureUserSettings(db: DbExecutor, userId: string, timezone: string) {
  await db
    .insert(userSettings)
    .values({ userId, timezone })
    .onConflictDoNothing({ target: userSettings.userId });
}

export async function getUserSettings(db: DbExecutor, userId: string) {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (!row) throw new NotFoundError('Account settings are missing.');
  return row;
}

export async function updateUserSettings(
  db: DbExecutor,
  userId: string,
  input: UpdateSettingsInput,
) {
  const current = await getUserSettings(db, userId);
  const dashboard: DashboardPreferences = input.dashboard
    ? { ...current.dashboard, ...input.dashboard }
    : current.dashboard;
  const [row] = await db
    .update(userSettings)
    .set({
      timezone: input.timezone ?? current.timezone,
      dateFormat: input.dateFormat ?? current.dateFormat,
      timeFormat: input.timeFormat ?? current.timeFormat,
      weekStartsOn: input.weekStartsOn ?? current.weekStartsOn,
      theme: input.theme ?? current.theme,
      defaultWorkspaceId:
        input.defaultWorkspaceId === undefined
          ? current.defaultWorkspaceId
          : input.defaultWorkspaceId,
      dashboard,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId))
    .returning();
  return row;
}

export async function markOnboardingComplete(db: DbExecutor, userId: string) {
  await db
    .update(userSettings)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(userSettings.userId, userId), isNull(userSettings.onboardingCompletedAt)));
}

/** Atomically reserves the next readable task number for a user. */
export async function nextTaskNumber(db: DbExecutor, userId: string): Promise<number> {
  const [row] = await db
    .update(userSettings)
    .set({ nextTaskNumber: sql`${userSettings.nextTaskNumber} + 1` })
    .where(eq(userSettings.userId, userId))
    .returning({ number: userSettings.nextTaskNumber });
  if (!row) throw new NotFoundError('Account settings are missing.');
  return row.number - 1;
}

export async function isOwner(db: DbExecutor, userId: string): Promise<boolean> {
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.role === 'owner';
}

export const createInvitationSchema = z.object({
  email: z.email().max(254).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
});

export async function createInvitation(
  db: DbExecutor,
  userId: string,
  input: z.infer<typeof createInvitationSchema>,
) {
  if (!(await isOwner(db, userId))) {
    throw new ForbiddenError('Only the installation owner can create invitations.');
  }
  const code = randomBytes(18).toString('base64url');
  const [row] = await db
    .insert(invitations)
    .values({
      code,
      email: input.email?.toLowerCase() ?? null,
      invitedByUserId: userId,
      expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
    })
    .returning();
  return row!;
}

export async function listInvitations(db: DbExecutor, userId: string) {
  if (!(await isOwner(db, userId))) {
    throw new ForbiddenError('Only the installation owner can view invitations.');
  }
  return db.select().from(invitations).orderBy(desc(invitations.createdAt)).limit(100);
}

export async function revokeInvitation(db: DbExecutor, userId: string, invitationId: string) {
  if (!(await isOwner(db, userId))) {
    throw new ForbiddenError('Only the installation owner can revoke invitations.');
  }
  const deleted = await db
    .delete(invitations)
    .where(and(eq(invitations.id, invitationId), isNull(invitations.usedAt)))
    .returning({ id: invitations.id });
  if (!deleted.length) throw new NotFoundError('Invitation not found or already used.');
}
