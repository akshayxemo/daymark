/**
 * Minimal structured logger. Emits one JSON object per line in production so
 * platform log drains can index it, and a readable line in development.
 *
 * Never log secrets, session tokens, passwords or user-generated content.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error' ? raw : 'info';
}

export type LogFields = Record<string, string | number | boolean | null | undefined>;

function write(level: LogLevel, message: string, fields?: LogFields) {
  if (order[level] < order[configuredLevel()]) return;
  const entry = { time: new Date().toISOString(), level, message, ...fields };
  const line =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(entry)
      : `[${entry.time}] ${level.toUpperCase()} ${message}${
          fields && Object.keys(fields).length ? ' ' + JSON.stringify(fields) : ''
        }`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};

/** Extracts a safe, non-sensitive description of an unknown error. */
export function describeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }
  return { errorMessage: String(error) };
}
