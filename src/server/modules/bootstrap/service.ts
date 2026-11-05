import type { DbExecutor } from '@/server/db/client';
import type { Env } from '@/server/config/env';
import { getRegistrationPolicy } from '@/server/auth/registration';
import { todayIn } from '@/lib/dates';
import { getTimerState } from '../time/service';
import { openTaskCounts } from '../tasks/service';
import { getUserSettings } from '../users/service';
import { getAllConfiguration, listWorkspaces } from '../workspaces/service';

/**
 * Everything the dashboard shell needs on first paint, in one round trip:
 * workspaces with counts, configuration, account settings and timer state.
 */
export async function bootstrap(db: DbExecutor, userId: string, env: Env) {
  const [workspaces, configuration, settings, counts, timer, policy] = await Promise.all([
    listWorkspaces(db, userId, { includeArchived: true }),
    getAllConfiguration(db, userId),
    getUserSettings(db, userId),
    openTaskCounts(db, userId),
    getTimerState(db, userId),
    getRegistrationPolicy(db, env),
  ]);
  return {
    workspaces: workspaces.map((workspace) => ({
      ...workspace,
      openTasks: counts.find((row) => row.workspaceId === workspace.id)?.open ?? 0,
      totalTasks: counts.find((row) => row.workspaceId === workspace.id)?.total ?? 0,
    })),
    configuration,
    settings,
    timer,
    today: todayIn(settings.timezone),
    app: {
      deploymentMode: policy.deploymentMode,
      registrationMode: policy.mode,
      requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
    },
  };
}

export type Bootstrap = Awaited<ReturnType<typeof bootstrap>>;
