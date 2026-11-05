import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads environment files for the test runners. Next.js deliberately ignores
 * `.env.local` when NODE_ENV=test, so tests read the files explicitly, in the
 * same precedence order Next.js uses for other environments:
 * `.env.test.local`, `.env.test`, `.env.local`, `.env`.
 * Existing process variables always win (CI sets them directly).
 */
export function loadTestEnv(dir = process.cwd()) {
  for (const file of ['.env.test.local', '.env.test', '.env.local', '.env']) {
    const full = path.join(dir, file);
    if (!existsSync(full)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(full, 'utf8')))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function parseEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2]!.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const comment = value.indexOf(' #');
      if (comment >= 0) value = value.slice(0, comment).trim();
    }
    result[match[1]!] = value;
  }
  return result;
}
