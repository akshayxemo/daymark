import { describe, expect, it } from 'vitest';
import { sectionFromPath, sectionPaths } from './routes';

describe('dashboard routes', () => {
  it('maps every section to a unique URL and back', () => {
    const entries = Object.entries(sectionPaths);
    expect(new Set(entries.map(([, path]) => path)).size).toBe(entries.length);
    for (const [section, path] of entries) expect(sectionFromPath(path)).toBe(section);
  });
  it('does not resolve unknown paths', () => {
    expect(sectionFromPath('/unknown')).toBeUndefined();
  });
});
