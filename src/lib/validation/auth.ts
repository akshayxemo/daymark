import { z } from 'zod';

export const emailSchema = z.email('Enter a valid email address.').max(254);
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'Use at most 128 characters.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().default(true),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you.').max(80),
  email: emailSchema,
  password: passwordSchema,
  invitationCode: z.string().trim().max(120).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.newPassword === value.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const changeEmailSchema = z.object({ newEmail: emailSchema });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password to confirm.'),
  confirmation: z.literal('DELETE', { error: 'Type DELETE to confirm.' }),
});
