import type { StatusCategory, WorkspaceKind } from '@/server/db/schema';

/**
 * Default configuration applied to every new workspace. Statuses, task types
 * and phases are stored per workspace so users can customize them later; the
 * application only relies on the behavioural flags, never on the names.
 */

export type StatusTemplate = {
  key: string;
  name: string;
  category: StatusCategory;
  color: string;
  isInitial?: boolean;
  isTerminal?: boolean;
  isActive?: boolean;
  countsAsCompleted?: boolean;
  stopsTimer?: boolean;
};

export const defaultStatuses: StatusTemplate[] = [
  { key: 'backlog', name: 'Backlog', category: 'not_started', color: 'muted', isInitial: true },
  { key: 'planned', name: 'Planned', category: 'not_started', color: 'purple' },
  { key: 'in_progress', name: 'In Progress', category: 'active', color: 'accent', isActive: true },
  { key: 'on_hold', name: 'On Hold', category: 'paused', color: 'orange', stopsTimer: true },
  { key: 'blocked', name: 'Blocked', category: 'waiting', color: 'orange', stopsTimer: true },
  {
    key: 'completed',
    name: 'Completed',
    category: 'done',
    color: 'accent',
    isTerminal: true,
    countsAsCompleted: true,
    stopsTimer: true,
  },
  {
    key: 'cancelled',
    name: 'Cancelled',
    category: 'closed',
    color: 'muted',
    isTerminal: true,
    stopsTimer: true,
  },
];

export type TaskTypeTemplate = { key: string; name: string; isDefault?: boolean };

const professionalTypes: TaskTypeTemplate[] = [
  { key: 'development', name: 'Development', isDefault: true },
  { key: 'bug_fix', name: 'Bug Fix' },
  { key: 'research', name: 'Research' },
  { key: 'testing', name: 'Testing' },
  { key: 'meeting', name: 'Meeting' },
  { key: 'documentation', name: 'Documentation' },
  { key: 'administration', name: 'Administration' },
  { key: 'other', name: 'Other' },
];

const personalTypes: TaskTypeTemplate[] = [
  { key: 'personal', name: 'Personal', isDefault: true },
  { key: 'administration', name: 'Administration' },
  { key: 'other', name: 'Other' },
];

const learningTypes: TaskTypeTemplate[] = [
  { key: 'learning', name: 'Learning', isDefault: true },
  { key: 'research', name: 'Research' },
  { key: 'other', name: 'Other' },
];

const customTypes: TaskTypeTemplate[] = [
  { key: 'development', name: 'Development' },
  { key: 'research', name: 'Research' },
  { key: 'meeting', name: 'Meeting' },
  { key: 'learning', name: 'Learning' },
  { key: 'personal', name: 'Personal' },
  { key: 'other', name: 'Other', isDefault: true },
];

export type PhaseTemplate = { key: string; name: string };

const developmentPhases: PhaseTemplate[] = [
  { key: 'requirement_analysis', name: 'Requirement Analysis' },
  { key: 'technical_planning', name: 'Technical Planning' },
  { key: 'development', name: 'Development' },
  { key: 'code_review', name: 'Code Review' },
  { key: 'qa_testing', name: 'QA / Testing' },
  { key: 'uat', name: 'UAT' },
  { key: 'deployment', name: 'Deployment' },
  { key: 'production_verification', name: 'Production Verification' },
  { key: 'completed', name: 'Completed' },
];

const simplePhases: PhaseTemplate[] = [
  { key: 'planning', name: 'Planning' },
  { key: 'in_progress', name: 'In Progress' },
  { key: 'review', name: 'Review' },
  { key: 'completed', name: 'Completed' },
];

export function defaultTaskTypesFor(kind: WorkspaceKind): TaskTypeTemplate[] {
  switch (kind) {
    case 'professional':
      return professionalTypes;
    case 'personal':
      return personalTypes;
    case 'learning':
      return learningTypes;
    default:
      return customTypes;
  }
}

export function defaultPhasesFor(kind: WorkspaceKind): PhaseTemplate[] {
  return kind === 'professional' || kind === 'custom' ? developmentPhases : simplePhases;
}

export type WorkspacePreset = {
  kind: WorkspaceKind;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
};

/** Workspaces offered during onboarding. Users may skip or rename any of them. */
export const onboardingPresets: WorkspacePreset[] = [
  {
    kind: 'professional',
    name: 'Office',
    slug: 'office',
    description: 'Professional work, projects, repositories and deliveries.',
    icon: 'briefcase',
    color: 'accent',
  },
  {
    kind: 'personal',
    name: 'Personal',
    slug: 'personal',
    description: 'Personal tasks, goals and life admin.',
    icon: 'leaf',
    color: 'purple',
  },
  {
    kind: 'learning',
    name: 'Learning',
    slug: 'learning',
    description: 'Courses, reading and skills you are building.',
    icon: 'book',
    color: 'orange',
  },
];

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'workspace';
}
