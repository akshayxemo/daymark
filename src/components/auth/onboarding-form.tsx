'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BookOpen, BriefcaseBusiness, Leaf, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { onboardingPresets } from '@/server/modules/workspaces/defaults';

type Draft = {
  name: string;
  kind: 'professional' | 'personal' | 'learning' | 'custom';
  icon: string;
  color: string;
  description: string;
};

const presetIcons = { briefcase: BriefcaseBusiness, leaf: Leaf, book: BookOpen } as const;

/** First-run setup: pick workspaces and a timezone. Skipping keeps Office and Personal. */
export function OnboardingForm({
  name,
  timezone,
  existing,
}: {
  name: string;
  timezone: string;
  existing: string[];
}) {
  const router = useRouter();
  const browserZone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
  const [zone, setZone] = useState(timezone === 'UTC' && browserZone ? browserZone : timezone);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    Office: true,
    Personal: true,
    Learning: false,
  });
  const [custom, setCustom] = useState<Draft[]>([]);
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chosen: Draft[] = [
    ...onboardingPresets
      .filter((preset) => selected[preset.name] && !existing.includes(preset.name))
      .map((preset) => ({
        name: preset.name,
        kind: preset.kind,
        icon: preset.icon,
        color: preset.color,
        description: preset.description,
      })),
    ...custom,
  ];

  const finish = async (drafts: Draft[]) => {
    setSaving(true);
    setError(null);
    try {
      const payload =
        drafts.length || existing.length
          ? drafts
          : [onboardingPresets[0]!, onboardingPresets[1]!].map((p) => ({
              name: p.name,
              kind: p.kind,
              icon: p.icon,
              color: p.color,
              description: p.description,
            }));
      await api.post('/me/onboarding', { workspaces: payload, timezone: zone });
      router.push('/app');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Setup could not be saved. Please try again.',
      );
      setSaving(false);
    }
  };

  return (
    <div className="task-form auth-form onboarding">
      <h1>Welcome, {name.split(' ')[0]}.</h1>
      <p>
        Daymark keeps each area of your life in its own private workspace. Start with the ones you
        need; you can add, rename or archive workspaces any time.
      </p>
      <div className="onboarding-grid">
        {onboardingPresets.map((preset) => {
          const Icon = presetIcons[preset.icon as keyof typeof presetIcons] ?? BriefcaseBusiness;
          const already = existing.includes(preset.name);
          const active = already || Boolean(selected[preset.name]);
          return (
            <button
              key={preset.name}
              type="button"
              className={`onboarding-option ${active ? 'selected' : ''}`}
              aria-pressed={active}
              disabled={already}
              onClick={() =>
                setSelected((state) => ({ ...state, [preset.name]: !state[preset.name] }))
              }
            >
              <Icon size={18} className={`ws-icon color-${preset.color}`} />
              <strong>{preset.name}</strong>
              <span>{already ? 'Already created' : preset.description}</span>
            </button>
          );
        })}
        {custom.map((draft, index) => (
          <div key={draft.name} className="onboarding-option selected">
            <BriefcaseBusiness size={18} className="ws-icon color-accent" />
            <strong>{draft.name}</strong>
            <span>Custom workspace</span>
            <button
              type="button"
              className="text-link"
              aria-label={`Remove ${draft.name}`}
              onClick={() => setCustom((list) => list.filter((_, i) => i !== index))}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = customName.trim();
          if (!trimmed) return;
          if (
            custom.some((d) => d.name.toLowerCase() === trimmed.toLowerCase()) ||
            onboardingPresets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
          ) {
            setError('That workspace name is already in the list.');
            return;
          }
          setCustom((list) => [
            ...list,
            { name: trimmed, kind: 'custom', icon: 'star', color: 'accent', description: '' },
          ]);
          setCustomName('');
          setError(null);
        }}
      >
        <input
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
          maxLength={60}
          placeholder="Add a custom workspace (e.g. Side project)"
          aria-label="Custom workspace name"
        />
        <Button type="submit" variant="outline" size="sm">
          <Plus size={14} />
          Add
        </Button>
      </form>
      <label>
        Timezone
        <input
          value={zone}
          onChange={(event) => setZone(event.target.value)}
          list="timezones"
          maxLength={64}
        />
        <small className="field-hint">
          Used for your daily plan and reports. Detected from this device; change it any time in
          Settings.
        </small>
      </label>
      <datalist id="timezones">
        {[
          'UTC',
          'Europe/London',
          'Europe/Berlin',
          'Europe/Paris',
          'Asia/Kolkata',
          'Asia/Singapore',
          'Asia/Tokyo',
          'Australia/Sydney',
          'America/New_York',
          'America/Chicago',
          'America/Denver',
          'America/Los_Angeles',
          'America/Sao_Paulo',
          'Africa/Johannesburg',
        ].map((tz) => (
          <option key={tz} value={tz} />
        ))}
      </datalist>
      {error && (
        <p className="project-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="ghost" disabled={saving} onClick={() => finish([])}>
          Skip for now
        </Button>
        <Button
          type="button"
          disabled={saving || (!chosen.length && !existing.length)}
          onClick={() => finish(chosen)}
        >
          {saving
            ? 'Setting up…'
            : `Create ${chosen.length || ''} workspace${chosen.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  );
}
