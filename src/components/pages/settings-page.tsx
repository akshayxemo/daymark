'use client';
import { Moon, Sun, ArrowDownToLine, Upload, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHead } from '@/components/dashboard/shared';
import type { State } from '@/lib/model';
import type { Dispatch, SetStateAction, RefObject } from 'react';
type Props = {
  state: State;
  setState: Dispatch<SetStateAction<State | null>>;
  exportData: () => void;
  importRef: RefObject<HTMLInputElement | null>;
  restore: (file?: File) => Promise<void>;
  navigate: (page: string) => void;
  setCustomize: Dispatch<SetStateAction<boolean>>;
};
export function SettingsPage({
  state,
  setState,
  exportData,
  importRef,
  restore,
  navigate,
  setCustomize,
}: Props) {
  return (
    <section className="card settings-card">
      <SectionHead
        title="Your preferences"
        subtitle="A local design preview. Your changes stay in this browser."
      />
      <div className="setting-row">
        <div>
          <h3>Appearance</h3>
          <p>A comfortable space, day or night.</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setState((p) => (p ? { ...p, theme: p.theme === 'dark' ? 'light' : 'dark' } : p))
          }
        >
          {state.theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          {state.theme === 'dark' ? 'Dark' : 'Light'} theme
        </Button>
      </div>
      <div className="setting-row">
        <div>
          <h3>Export your demo data</h3>
          <p>Download tasks, activity, sessions, goals, and journal as JSON.</p>
        </div>
        <Button variant="outline" onClick={exportData}>
          <ArrowDownToLine size={15} />
          Export data
        </Button>
      </div>
      <div className="setting-row">
        <div>
          <h3>Restore a demo export</h3>
          <p>Replace this browser’s demo data with a valid Daymark export.</p>
        </div>
        <Button variant="outline" onClick={() => importRef.current?.click()}>
          <Upload size={15} />
          Import JSON
        </Button>
        <input
          type="file"
          accept="application/json"
          hidden
          ref={importRef}
          onChange={(e) => restore(e.target.files?.[0])}
        />
      </div>
      <div className="setting-row">
        <div>
          <h3>Dashboard widgets</h3>
          <p>Choose how much you want to see.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            navigate('Overview');
            setCustomize(true);
          }}
        >
          <SlidersHorizontal size={15} />
          Customize
        </Button>
      </div>
      <div className="preview-note">
        <ShieldCheck size={20} />
        <div>
          <h3>Built around your ownership</h3>
          <p>
            This dashboard is the interactive design milestone. Authentication, PostgreSQL,
            server-side timers, and multi-user isolation are planned in the product specification
            and are not connected in this preview.
          </p>
        </div>
      </div>
    </section>
  );
}
