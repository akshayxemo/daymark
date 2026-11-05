'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBootstrap, useApiMutation } from '@/lib/api/queries';
import { api } from '@/lib/api/client';
import type { Bootstrap, Configuration, UserSettings, WorkspaceView } from '@/lib/api/types';
import type { Period } from '@/lib/dates';

export const ALL_WORKSPACES = 'all';

export type CreateTaskDefaults = {
  workspaceId?: string;
  plannedDate?: string | null;
  projectId?: string | null;
};

type AppContextValue = {
  bootstrap: Bootstrap;
  workspaces: WorkspaceView[];
  activeWorkspaces: WorkspaceView[];
  configuration: Configuration;
  settings: UserSettings;
  today: string;
  /** Selected workspace id or "all". */
  workspaceFilter: string;
  setWorkspaceFilter: (value: string) => void;
  /** The workspace id to pass to API queries (undefined for all). */
  workspaceId: string | undefined;
  period: Period;
  setPeriod: (value: Period) => void;
  selectedTaskId: string | null;
  openTask: (taskId: string | null) => void;
  createDefaults: CreateTaskDefaults | null;
  openCreate: (defaults?: CreateTaskDefaults) => void;
  closeCreate: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toast: (message: string) => void;
  toastMessage: string;
  hiddenWidgets: string[];
  toggleWidget: (name: string) => void;
  workspaceById: (id: string | null | undefined) => WorkspaceView | undefined;
  workspaceLabel: (id: string | null | undefined) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside the application shell.');
  return value;
}

export function AppProvider({ initial, children }: { initial: Bootstrap; children: ReactNode }) {
  const query = useBootstrap({ initialData: initial });
  const bootstrap = query.data ?? initial;
  const storedFilter = bootstrap.settings.dashboard.workspaceFilter;
  const [workspaceFilter, setWorkspaceFilterState] = useState<string>(
    storedFilter ?? ALL_WORKSPACES,
  );
  const [period, setPeriodState] = useState<Period>(bootstrap.settings.dashboard.period ?? 'week');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createDefaults, setCreateDefaults] = useState<CreateTaskDefaults | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePreferences = useApiMutation(
    (dashboard: Partial<UserSettings['dashboard']>) => api.patch('/me/settings', { dashboard }),
    'settings',
  );

  const workspaces = bootstrap.workspaces;
  const activeWorkspaces = useMemo(() => workspaces.filter((w) => !w.archivedAt), [workspaces]);

  // Fall back to "all" when the saved workspace no longer exists or was archived.
  const effectiveFilter =
    workspaceFilter !== ALL_WORKSPACES && !activeWorkspaces.some((w) => w.id === workspaceFilter)
      ? ALL_WORKSPACES
      : workspaceFilter;

  const setWorkspaceFilter = useCallback(
    (value: string) => {
      setWorkspaceFilterState(value);
      savePreferences.mutate({ workspaceFilter: value });
    },
    [savePreferences],
  );
  const setPeriod = useCallback(
    (value: Period) => {
      setPeriodState(value);
      savePreferences.mutate({ period: value });
    },
    [savePreferences],
  );
  const hiddenWidgets = useMemo(
    () => bootstrap.settings.dashboard.hiddenWidgets ?? [],
    [bootstrap.settings.dashboard.hiddenWidgets],
  );
  const toggleWidget = useCallback(
    (name: string) => {
      const next = hiddenWidgets.includes(name)
        ? hiddenWidgets.filter((w) => w !== name)
        : [...hiddenWidgets, name];
      savePreferences.mutate({ hiddenWidgets: next });
    },
    [hiddenWidgets, savePreferences],
  );

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 3500);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Apply the account theme to the document and remember it for the next paint.
  useEffect(() => {
    const theme = bootstrap.settings.theme;
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : theme;
    document.documentElement.dataset.theme = resolved;
    document.cookie = `daymark.theme=${resolved}; path=/; max-age=31536000; samesite=lax`;
  }, [bootstrap.settings.theme]);

  const workspaceById = useCallback(
    (id: string | null | undefined) => workspaces.find((w) => w.id === id),
    [workspaces],
  );
  const workspaceLabel = useCallback(
    (id: string | null | undefined) =>
      workspaces.find((w) => w.id === id)?.name ?? 'All workspaces',
    [workspaces],
  );

  const value: AppContextValue = {
    bootstrap,
    workspaces,
    activeWorkspaces,
    configuration: bootstrap.configuration,
    settings: bootstrap.settings,
    today: bootstrap.today,
    workspaceFilter: effectiveFilter,
    setWorkspaceFilter,
    workspaceId: effectiveFilter === ALL_WORKSPACES ? undefined : effectiveFilter,
    period,
    setPeriod,
    selectedTaskId,
    openTask: setSelectedTaskId,
    createDefaults,
    openCreate: (defaults) => setCreateDefaults(defaults ?? {}),
    closeCreate: () => setCreateDefaults(null),
    searchOpen,
    setSearchOpen,
    mobileNavOpen,
    setMobileNavOpen,
    toast,
    toastMessage,
    hiddenWidgets,
    toggleWidget,
    workspaceById,
    workspaceLabel,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Status helpers derived from workspace configuration. */
export function useStatusHelpers() {
  const { configuration } = useApp();
  return useMemo(() => {
    const byWorkspace = (workspaceId: string) =>
      configuration.statuses.filter((s) => s.workspaceId === workspaceId);
    return {
      statusesFor: byWorkspace,
      completedStatus: (workspaceId: string) =>
        byWorkspace(workspaceId).find((s) => s.countsAsCompleted),
      reopenStatus: (workspaceId: string) =>
        byWorkspace(workspaceId).find((s) => s.key === 'planned') ??
        byWorkspace(workspaceId).find((s) => s.isInitial),
      activeStatus: (workspaceId: string) => byWorkspace(workspaceId).find((s) => s.isActive),
      phasesFor: (workspaceId: string, taskTypeId?: string | null) =>
        configuration.phases.filter(
          (p) =>
            p.workspaceId === workspaceId &&
            p.isEnabled &&
            (!p.taskTypeId || p.taskTypeId === taskTypeId),
        ),
      typesFor: (workspaceId: string) =>
        configuration.taskTypes.filter((t) => t.workspaceId === workspaceId),
      tagsFor: (workspaceId: string) =>
        configuration.tags.filter((t) => t.workspaceId === workspaceId),
    };
  }, [configuration]);
}
