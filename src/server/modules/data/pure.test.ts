import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';
import { previewRestore } from './restore';
import { legacyStateSchema, previewLegacy } from '@/lib/legacy-import';

describe('CSV export', () => {
  it('quotes separators and neutralises spreadsheet formulas', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-1+1')).toBe("'-1+1");
    expect(csvCell(null)).toBe('');
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n');
  });
});

const ws = '11111111-1111-4111-8111-111111111111';
const status = '22222222-2222-4222-8222-222222222222';
const type = '33333333-3333-4333-8333-333333333333';
const task = '44444444-4444-4444-8444-444444444444';
const envelope = (data: Record<string, unknown[]>) => ({
  format: 'daymark-export',
  version: 1,
  exportId: '55555555-5555-4555-8555-555555555555',
  exportedAt: '2026-11-05T10:00:00.000Z',
  data,
});

describe('restore validation', () => {
  it('accepts an internally consistent export', () => {
    const { summary } = previewRestore(
      envelope({
        workspaces: [{ id: ws, name: 'Office', slug: 'office' }],
        taskStatuses: [{ id: status, workspaceId: ws, name: 'Planned' }],
        taskTypes: [{ id: type, workspaceId: ws, name: 'Dev' }],
        tasks: [
          {
            id: task,
            workspaceId: ws,
            statusId: status,
            taskTypeId: type,
            taskNumber: 1,
            title: 'A',
          },
        ],
      }),
    );
    expect(summary.tasks).toBe(1);
    expect(summary.workspaces).toBe(1);
  });
  it('rejects references to records outside the export', () => {
    expect(() =>
      previewRestore(
        envelope({
          workspaces: [],
          tasks: [{ id: task, workspaceId: ws, statusId: status, taskTypeId: type }],
        }),
      ),
    ).toThrow(/not part of this export/);
  });
  it('rejects unknown formats and malformed identifiers', () => {
    expect(() => previewRestore({ format: 'other', version: 1 })).toThrow(
      /not a valid Daymark export/,
    );
    expect(() => previewRestore(envelope({ workspaces: [{ id: 'not-a-uuid' }] }))).toThrow(
      /invalid identifier/,
    );
  });
});

describe('legacy browser data', () => {
  const sample = {
    version: 1,
    tasks: [
      {
        id: 'DM-104',
        title: 'Build the workspace switcher',
        description: '',
        workspace: 'Office',
        project: 'Daymark platform',
        status: 'active',
        priority: 'High',
        phase: 'Development',
        estimate: 120,
        date: '2026-11-05',
      },
      {
        id: 'DM-ABC123',
        title: 'My own task',
        description: '',
        workspace: 'Personal',
        project: '',
        status: 'planned',
        priority: 'Low',
        phase: 'Planning',
        estimate: 10,
        date: '2026-11-05',
      },
    ],
    sessions: [{ id: 's1', taskId: 'DM-104', seconds: 600, endedAt: 1793900000000 }],
    activities: [],
    timer: null,
    journal: '',
    goals: [true, false, false, false],
  };
  it('validates and previews, separating fictional sample tasks', () => {
    const state = legacyStateSchema.parse(sample);
    const preview = previewLegacy(state);
    expect(preview).toMatchObject({
      tasks: 2,
      projects: 1,
      sessions: 1,
      trackedSeconds: 600,
      sampleTaskCount: 1,
      looksLikeSample: false,
    });
  });
  it('rejects sessions that point at missing tasks', () => {
    expect(
      legacyStateSchema.safeParse({
        ...sample,
        sessions: [{ id: 's', taskId: 'nope', seconds: 1, endedAt: 1 }],
      }).success,
    ).toBe(false);
  });
});
