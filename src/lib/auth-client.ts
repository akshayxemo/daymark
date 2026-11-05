'use client';
import { createAuthClient } from 'better-auth/react';

/**
 * Browser-side Better Auth client. The base URL defaults to the current
 * origin, so no public environment variable is needed.
 */
export const authClient = createAuthClient();

export type AuthSession = typeof authClient.$Infer.Session;
