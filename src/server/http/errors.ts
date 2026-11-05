/**
 * Application errors carry an HTTP status and a stable machine-readable code.
 * Route handlers translate them into JSON responses; everything else becomes
 * a generic 500 so internal details never leak to clients.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'The request could not be processed.', details?: unknown) {
    super(400, 'bad_request', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Some fields are invalid.',
    public readonly issues: { path: string; message: string }[] = [],
  ) {
    super(400, 'validation_error', message, { issues });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You need to sign in to continue.') {
    super(401, 'unauthorized', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super(403, 'forbidden', message);
  }
}

/**
 * Used for every record that is missing *or* owned by someone else, so an
 * attacker cannot distinguish the two cases by guessing identifiers.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(404, 'not_found', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'This change conflicts with the current state.', details?: unknown) {
    super(409, 'conflict', message, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
