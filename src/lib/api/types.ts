/**
 * Type-only re-exports of server response shapes for client code. These are
 * erased at compile time, so no server module is ever bundled for the browser.
 */
export type { Bootstrap } from '@/server/modules/bootstrap/service';
export type {
  TaskSummary,
  TaskDetail,
  StatusRef,
  TagRef,
  DependencyRef,
} from '@/server/modules/tasks/service';
export type {
  TimerState,
  TimeRecord,
  DailyTotal,
  OverlapConflict,
} from '@/server/modules/time/service';
export type { ProjectSummary } from '@/server/modules/projects/service';
export type { ActivityView } from '@/server/modules/activity/service';
export type { OverviewMetrics, ReportMetrics } from '@/server/modules/analytics/service';
export type { JournalEntryView } from '@/server/modules/journal/service';
export type { WorkspaceRow } from '@/server/modules/workspaces/service';

import type { Bootstrap } from '@/server/modules/bootstrap/service';
export type WorkspaceView = Bootstrap['workspaces'][number];
export type Configuration = Bootstrap['configuration'];
export type StatusRow = Configuration['statuses'][number];
export type TaskTypeRow = Configuration['taskTypes'][number];
export type PhaseRow = Configuration['phases'][number];
export type TagRow = Configuration['tags'][number];
export type UserSettings = Bootstrap['settings'];

export type RepositoryView = {
  id: string;
  workspaceId: string;
  name: string;
  owner: string | null;
  provider: string;
  repositoryUrl: string;
  defaultBranch: string | null;
  description: string;
  archivedAt: string | null;
  taskCount: number;
  deliveryCount: number;
};

export type DeliveryView = {
  id: string;
  workspaceId: string;
  taskId: string;
  repositoryId: string | null;
  deliveryType: 'merged' | 'deployed' | 'verified';
  environment: string;
  deliveryStatus: 'pending' | 'successful' | 'failed';
  branchName: string | null;
  version: string | null;
  referenceUrl: string | null;
  deliveredAt: string;
  notes: string;
  taskNumber: number;
  taskReference: string;
  taskTitle: string;
  projectName: string | null;
  repositoryName: string | null;
};

export type WeeklyGoalView = {
  id: string;
  workspaceId: string | null;
  workspaceName: string | null;
  title: string;
  description: string;
  weekStartDate: string;
  weekEndDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'dropped';
  position: number;
  completedAt: string | null;
};

export type DailyReviewView = {
  id: string;
  workspaceId: string | null;
  reviewDate: string;
  notes: string;
  accomplishments: string;
  blockers: string;
  learnings: string;
  tomorrowPriorities: string;
  rating: number | null;
  reviewedAt: string | null;
  updatedAt: string;
};

export type MeView = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    isOwner: boolean;
  };
  settings: UserSettings;
  registration: {
    mode: 'open' | 'invite' | 'disabled';
    deploymentMode: 'single-user' | 'multi-user';
  };
  email: { provider: string; requireVerification: boolean };
};

export type InvitationView = {
  id: string;
  code: string;
  email: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};
