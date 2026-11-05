'use client';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useApiMutation, useJournal, useProjects } from '@/lib/api/queries';
import type { JournalEntryView } from '@/lib/api/types';
import { formatIsoDate } from '@/lib/dates';
import { useApp, useStatusHelpers } from '../context';
import { Markdown } from '../markdown';
import { ErrorNote, LoadingRows, Modal, SectionHead, WorkspaceTag } from '../shared';
import { DailyReview } from './my-day';

export const entryTypes = [
  ['daily_review', 'Daily review'],
  ['technical', 'Technical note'],
  ['personal', 'Personal note'],
  ['meeting', 'Meeting note'],
  ['learning', 'Learning note'],
  ['achievement', 'Achievement'],
  ['blocker', 'Blocker'],
  ['general', 'General'],
] as const;
const typeLabel = Object.fromEntries(entryTypes) as Record<string, string>;

export function JournalPage() {
  const app = useApp();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [type, setType] = useState('');
  const [editor, setEditor] = useState<JournalEntryView | 'new' | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);
  const entries = useJournal({
    workspaceId: app.workspaceId,
    entryType: type || undefined,
    search: debounced || undefined,
    limit: 50,
  });
  return (
    <div className="page-stack">
      <DailyReview date={app.today} />
      <section className="card">
        <SectionHead
          title="Notes and reflections"
          subtitle="Private to you. Markdown supported."
          action={
            <Button size="sm" onClick={() => setEditor('new')}>
              <Plus size={14} />
              New entry
            </Button>
          }
        />
        <div className="toolbar-row" role="search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries"
            aria-label="Search journal"
          />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Entry type">
            <option value="">All types</option>
            {entryTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {entries.isLoading && <LoadingRows />}
        {(entries.data?.items ?? []).map((entry) => (
          <article className="journal-entry" key={entry.id}>
            <h3>
              <button className="text-link" onClick={() => setEditor(entry)}>
                {entry.title}
              </button>
            </h3>
            <div className="meta">
              <span>{formatIsoDate(entry.entryDate, { year: true })}</span>
              <span>{typeLabel[entry.entryType] ?? entry.entryType}</span>
              {entry.workspaceId && <WorkspaceTag workspaceId={entry.workspaceId} />}
              {entry.projectName && <span>{entry.projectName}</span>}
              {entry.tasks.map((task) => (
                <button key={task.id} className="text-link" onClick={() => app.openTask(task.id)}>
                  DM-{task.taskNumber}
                </button>
              ))}
              {entry.tags.map((tag) => (
                <span key={tag.id}>#{tag.name}</span>
              ))}
            </div>
            <Markdown content={entry.content} />
          </article>
        ))}
        {!entries.isLoading && !entries.data?.items.length && (
          <p className="empty">Your first entry will appear here.</p>
        )}
      </section>
      {editor && (
        <EntryEditor entry={editor === 'new' ? null : editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}

function EntryEditor({ entry, onClose }: { entry: JournalEntryView | null; onClose: () => void }) {
  const app = useApp();
  const helpers = useStatusHelpers();
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [entryType, setEntryType] = useState(entry?.entryType ?? 'general');
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? app.today);
  const [workspaceId, setWorkspaceId] = useState(entry?.workspaceId ?? app.workspaceId ?? '');
  const [projectId, setProjectId] = useState(entry?.projectId ?? '');
  const [tagIds, setTagIds] = useState<string[]>(entry?.tags.map((t) => t.id) ?? []);
  const [preview, setPreview] = useState(false);
  const projects = useProjects({ workspaceId: workspaceId || undefined });
  const tags = workspaceId ? helpers.tagsFor(workspaceId) : [];
  const body = {
    title,
    content,
    entryType,
    entryDate,
    workspaceId: workspaceId || null,
    projectId: projectId || null,
    tagIds,
  };
  const save = useApiMutation(
    () => (entry ? api.patch(`/journal/${entry.id}`, body) : api.post('/journal', body)),
    'journal',
    { onSuccess: onClose },
  );
  const remove = useApiMutation(() => api.delete(`/journal/${entry!.id}`), 'journal', {
    onSuccess: onClose,
  });
  const issues = save.error instanceof ApiError ? save.error.issues : {};
  return (
    <Modal title={entry ? 'Edit entry' : 'New journal entry'} onClose={onClose} wide>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(undefined);
        }}
      >
        <label>
          Title
          <input
            autoFocus
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {issues.title && <span className="field-error">{issues.title}</span>}
        </label>
        <div className="form-grid">
          <label>
            Type
            <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
              {entryTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </label>
          <label>
            Workspace
            <select
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setProjectId('');
                setTagIds([]);
              }}
            >
              <option value="">All workspaces</option>
              {app.activeWorkspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!workspaceId}
            >
              <option value="">No project</option>
              {(projects.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {tags.length > 0 && (
          <div className="pill-list" aria-label="Tags">
            {tags.map((tag) => {
              const active = tagIds.includes(tag.id);
              return (
                <button
                  type="button"
                  key={tag.id}
                  className={`pill ${active ? 'active' : ''}`}
                  aria-pressed={active}
                  onClick={() =>
                    setTagIds(active ? tagIds.filter((id) => id !== tag.id) : [...tagIds, tag.id])
                  }
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        )}
        <div className="task-tabs">
          <button
            type="button"
            className={!preview ? 'active' : ''}
            onClick={() => setPreview(false)}
          >
            Write
          </button>
          <button
            type="button"
            className={preview ? 'active' : ''}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
        {preview ? (
          <div className="detail-description">
            <Markdown content={content || '_Nothing to preview yet._'} />
          </div>
        ) : (
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Content (Markdown)"
            placeholder="Write in Markdown…"
          />
        )}
        {save.error && !issues.title && <ErrorNote error={save.error} />}
        <div className="form-actions">
          {entry && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => remove.mutate(undefined)}
              disabled={remove.isPending}
            >
              Archive entry
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Save entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
