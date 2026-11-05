'use client';
import { Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { useInvalidate } from '@/lib/api/queries';
import { LEGACY_STORAGE_KEY, type LegacyPreview } from '@/lib/legacy-import';
import { hoursLabel } from '@/lib/dates';
import { useApp } from '../context';

/** Browser storage as an external store, so React reads it without effects. */
const storageEvent = 'daymark-legacy-storage';
function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(storageEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(storageEvent, callback);
  };
}
function readLegacyRaw(): string | null {
  try {
    return window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}
function parseLegacy(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Restore from a JSON export, and migrate data left by the browser-only prototype. */
export function ImportPanel() {
  const app = useApp();
  const invalidate = useInvalidate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{
    name: string;
    text: string;
    summary: Record<string, number>;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const legacyRaw = useSyncExternalStore(subscribeStorage, readLegacyRaw, () => null);
  const legacy = useMemo(() => parseLegacy(legacyRaw), [legacyRaw]);
  const legacyPreview = useQuery({
    queryKey: ['legacy-preview', legacyRaw],
    queryFn: () =>
      api.post<{ preview: LegacyPreview & { alreadyImported: boolean } }>('/import/local', {
        state: legacy,
        dryRun: true,
      }),
    enabled: legacy !== null,
    retry: false,
  });
  const preview = legacy !== null ? (legacyPreview.data?.preview ?? null) : null;
  const [includeSample, setIncludeSample] = useState(false);

  const pick = async (selected?: File) => {
    setError(null);
    setMessage(null);
    if (!selected) return;
    const text = await selected.text();
    try {
      const result = await fetch('/api/v1/import/restore?dryRun=true', {
        method: 'POST',
        body: text,
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await result.json();
      if (!result.ok)
        throw new Error(payload?.error?.message ?? 'This file is not a valid Daymark export.');
      setFile({ name: selected.name, text, summary: payload.data.summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This file is not a valid Daymark export.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const restore = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fetch('/api/v1/import/restore', {
        method: 'POST',
        body: file.text,
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await result.json();
      if (!result.ok)
        throw new Error(payload?.error?.message ?? 'Import failed. Nothing was changed.');
      setMessage(
        `Restored ${payload.data.summary.tasks ?? 0} tasks into ${payload.data.summary.workspaces ?? 0} workspaces.`,
      );
      setFile(null);
      await invalidate(['workspaces', 'tasks', 'time', 'journal', 'goals', 'repositories']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const importLocal = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ summary: Record<string, number> }>('/import/local', {
        state: legacy,
        includeSample,
      });
      setMessage(
        `Imported ${result.summary.tasks} tasks and ${result.summary.sessions} sessions from this browser. The browser copy was kept; remove it once you have checked the result.`,
      );
      await legacyPreview.refetch();
      await invalidate(['workspaces', 'tasks', 'time', 'journal']);
      app.toast('Browser data imported');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  const removeLocal = () => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event(storageEvent));
    app.toast('Browser copy removed');
  };

  return (
    <>
      <div className="setting-row">
        <div>
          <h3>Restore from an export</h3>
          <p>
            Adds the records from a Daymark JSON export to this account in one transaction. Nothing
            is overwritten, and a failed import changes nothing.
          </p>
        </div>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload size={15} />
          Choose file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
          aria-label="Daymark export file"
        />
      </div>
      {file && (
        <div className="import-preview card">
          <p>
            <strong>{file.name}</strong> is valid. It contains:
          </p>
          <ul>
            {Object.entries(file.summary)
              .filter(([, count]) => count > 0)
              .map(([key, count]) => (
                <li key={key}>
                  {count} {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </li>
              ))}
          </ul>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setFile(null)}>
              Cancel
            </Button>
            <Button onClick={restore} disabled={busy}>
              {busy ? 'Restoring…' : 'Restore into my account'}
            </Button>
          </div>
        </div>
      )}
      {preview && legacy !== null && (
        <div className="import-preview card">
          <h3>Data from the browser-only preview was found</h3>
          <p className="detail-hint">
            This browser still holds data saved by the earlier local-only version of Daymark (
            {preview.tasks} tasks, {preview.projects} projects, {preview.sessions} sessions,{' '}
            {hoursLabel(preview.trackedSeconds)} tracked
            {preview.hasJournal ? ', a journal note' : ''}).
          </p>
          {preview.looksLikeSample && (
            <p className="detail-hint">
              It looks like the built-in fictional sample data and was probably never changed.
            </p>
          )}
          {preview.alreadyImported ? (
            <p className="detail-hint">This data has already been imported into your account.</p>
          ) : (
            <>
              {preview.sampleTaskCount > 0 && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={includeSample}
                    onChange={(e) => setIncludeSample(e.target.checked)}
                  />
                  Also import the {preview.sampleTaskCount} fictional sample task
                  {preview.sampleTaskCount === 1 ? '' : 's'}
                </label>
              )}
              <div className="form-actions">
                <Button onClick={importLocal} disabled={busy}>
                  {busy ? 'Importing…' : 'Import into my account'}
                </Button>
              </div>
            </>
          )}
          <div className="form-actions">
            <Button variant="ghost" size="sm" onClick={removeLocal}>
              Remove the browser copy
            </Button>
          </div>
        </div>
      )}
      {message && <p className="detail-hint">{message}</p>}
      {error && (
        <p className="project-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
