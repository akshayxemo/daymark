import { NextResponse } from 'next/server';
import { z } from 'zod';
import { describeError, logger } from '@/server/logging';
import { AppError, ValidationError } from './errors';

/** Responses carrying user data must never be cached by shared caches. */
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { ...init, headers: { ...privateHeaders, ...init?.headers } });
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204, headers: privateHeaders });
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status, headers: privateHeaders },
    );
  }
  logger.error('Unhandled request error', describeError(error));
  return NextResponse.json(
    { error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } },
    { status: 500, headers: privateHeaders },
  );
}

export function validationErrorFromZod(error: z.ZodError): ValidationError {
  return new ValidationError(
    'Some fields are invalid.',
    error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  );
}

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError('The request body must be valid JSON.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationErrorFromZod(result.error);
  return result.data;
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.infer<T> {
  const params = new URL(request.url).searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const [key, value] of params.entries()) {
    const existing = raw[key];
    if (existing === undefined) raw[key] = value;
    else raw[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw validationErrorFromZod(result.error);
  return result.data;
}

export function parseWith<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw validationErrorFromZod(result.error);
  return result.data;
}
