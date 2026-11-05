CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"email" text,
	"invited_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_request" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('owner', 'member'))
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"date_format" text DEFAULT 'yyyy-MM-dd' NOT NULL,
	"time_format" text DEFAULT '24h' NOT NULL,
	"week_starts_on" smallint DEFAULT 1 NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"default_workspace_id" uuid,
	"dashboard" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_task_number" integer DEFAULT 1 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_week_start_check" CHECK ("user_settings"."week_starts_on" between 0 and 6),
	CONSTRAINT "user_settings_time_format_check" CHECK ("user_settings"."time_format" in ('24h', '12h')),
	CONSTRAINT "user_settings_theme_check" CHECK ("user_settings"."theme" in ('dark', 'light', 'system'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"color" text,
	"start_date" date,
	"due_date" date,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_owner_workspace_id_unique" UNIQUE("user_id","workspace_id","id"),
	CONSTRAINT "projects_status_check" CHECK ("projects"."status" in ('active', 'on_hold', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_owner_workspace_id_unique" UNIQUE("user_id","workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "task_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_type_id" uuid,
	"key" text,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_phases_workspace_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "task_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"color" text,
	"is_initial" boolean DEFAULT false NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"counts_as_completed" boolean DEFAULT false NOT NULL,
	"stops_timer" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_statuses_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "task_statuses_category_check" CHECK ("task_statuses"."category" in ('not_started', 'active', 'paused', 'waiting', 'done', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "task_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_types_workspace_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"working_days" jsonb DEFAULT '[1,2,3,4,5]'::jsonb NOT NULL,
	"working_minutes_per_day" integer DEFAULT 480 NOT NULL,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_minutes_check" CHECK ("workspace_settings"."working_minutes_per_day" between 0 and 1440)
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'briefcase' NOT NULL,
	"color" text DEFAULT 'accent' NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_owner_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "workspaces_kind_check" CHECK ("workspaces"."kind" in ('professional', 'personal', 'learning', 'custom'))
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"depends_on_task_id" uuid NOT NULL,
	"dependency_type" text DEFAULT 'blocks' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_dependencies_not_self_check" CHECK ("task_dependencies"."task_id" <> "task_dependencies"."depends_on_task_id"),
	CONSTRAINT "task_dependencies_type_check" CHECK ("task_dependencies"."dependency_type" in ('blocks'))
);
--> statement-breakpoint
CREATE TABLE "task_phase_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"previous_phase_id" uuid,
	"previous_phase_name" text,
	"new_phase_id" uuid,
	"new_phase_name" text,
	"notes" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"planned_date" date,
	"previous_planned_date" date,
	"planned_minutes" integer,
	"planning_period" text DEFAULT 'day' NOT NULL,
	"reason" text DEFAULT 'initial' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_plans_period_check" CHECK ("task_plans"."planning_period" in ('day', 'week')),
	CONSTRAINT "task_plans_reason_check" CHECK ("task_plans"."reason" in ('initial', 'moved', 'carryover', 'unplanned'))
);
--> statement-breakpoint
CREATE TABLE "task_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid NOT NULL,
	"previous_status_id" uuid,
	"previous_status_name" text,
	"new_status_id" uuid NOT NULL,
	"new_status_name" text NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "task_tags_task_id_tag_id_pk" PRIMARY KEY("task_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"parent_task_id" uuid,
	"task_type_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"phase_id" uuid,
	"task_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"estimated_minutes" integer,
	"planned_date" date,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_owner_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "tasks_owner_workspace_id_unique" UNIQUE("user_id","workspace_id","id"),
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" in ('low', 'medium', 'high')),
	CONSTRAINT "tasks_estimate_check" CHECK ("tasks"."estimated_minutes" is null or "tasks"."estimated_minutes" >= 0),
	CONSTRAINT "tasks_parent_not_self_check" CHECK ("tasks"."parent_task_id" is null or "tasks"."parent_task_id" <> "tasks"."id"),
	CONSTRAINT "tasks_title_check" CHECK (length("tasks"."title") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"phase_id" uuid,
	"work_date" date NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_entries_duration_check" CHECK ("time_entries"."duration_seconds" > 0),
	CONSTRAINT "time_entries_range_check" CHECK (("time_entries"."started_at" is null and "time_entries"."ended_at" is null) or ("time_entries"."started_at" is not null and "time_entries"."ended_at" is not null and "time_entries"."ended_at" > "time_entries"."started_at")),
	CONSTRAINT "time_entries_source_check" CHECK ("time_entries"."source" in ('manual', 'import'))
);
--> statement-breakpoint
CREATE TABLE "time_entry_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"action" text NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_entry_audit_action_check" CHECK ("time_entry_audit"."action" in ('created', 'updated', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "work_session_intervals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "work_session_intervals_order_check" CHECK ("work_session_intervals"."ended_at" is null or "work_session_intervals"."ended_at" >= "work_session_intervals"."started_at")
);
--> statement-breakpoint
CREATE TABLE "work_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"phase_id" uuid,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'timer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_sessions_status_check" CHECK ("work_sessions"."status" in ('running', 'paused', 'completed', 'cancelled')),
	CONSTRAINT "work_sessions_duration_check" CHECK ("work_sessions"."duration_seconds" >= 0),
	CONSTRAINT "work_sessions_source_check" CHECK ("work_sessions"."source" in ('timer', 'import'))
);
--> statement-breakpoint
CREATE TABLE "delivery_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid,
	"delivery_type" text NOT NULL,
	"environment" text NOT NULL,
	"delivery_status" text DEFAULT 'successful' NOT NULL,
	"branch_name" text,
	"version" text,
	"reference_url" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_records_type_check" CHECK ("delivery_records"."delivery_type" in ('merged', 'deployed', 'verified')),
	CONSTRAINT "delivery_records_environment_check" CHECK ("delivery_records"."environment" in ('development', 'staging', 'uat', 'production', 'other')),
	CONSTRAINT "delivery_records_status_check" CHECK ("delivery_records"."delivery_status" in ('pending', 'successful', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "development_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid,
	"reference_type" text NOT NULL,
	"reference_id" text,
	"title" text,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "development_references_type_check" CHECK ("development_references"."reference_type" in ('jira', 'pull_request', 'commit', 'issue', 'documentation', 'other')),
	CONSTRAINT "development_references_content_check" CHECK (coalesce("development_references"."reference_id", '') <> '' or coalesce("development_references"."url", '') <> '')
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"owner" text,
	"provider" text DEFAULT 'github' NOT NULL,
	"repository_url" text DEFAULT '' NOT NULL,
	"default_branch" text,
	"description" text DEFAULT '' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_owner_workspace_id_unique" UNIQUE("user_id","workspace_id","id"),
	CONSTRAINT "repositories_provider_check" CHECK ("repositories"."provider" in ('github', 'gitlab', 'bitbucket', 'azure', 'other'))
);
--> statement-breakpoint
CREATE TABLE "task_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"codebase_name" text,
	"branch_name" text,
	"branch_url" text,
	"work_status" text DEFAULT 'in_progress' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_repositories_status_check" CHECK ("task_repositories"."work_status" in ('planned', 'in_progress', 'in_review', 'merged', 'abandoned'))
);
--> statement-breakpoint
CREATE TABLE "daily_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid,
	"review_date" date NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"accomplishments" text DEFAULT '' NOT NULL,
	"blockers" text DEFAULT '' NOT NULL,
	"learnings" text DEFAULT '' NOT NULL,
	"tomorrow_priorities" text DEFAULT '' NOT NULL,
	"rating" smallint,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_reviews_rating_check" CHECK ("daily_reviews"."rating" is null or "daily_reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid,
	"project_id" uuid,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"entry_type" text DEFAULT 'general' NOT NULL,
	"entry_date" date NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_type_check" CHECK ("journal_entries"."entry_type" in ('daily_review', 'technical', 'personal', 'meeting', 'learning', 'achievement', 'blocker', 'general'))
);
--> statement-breakpoint
CREATE TABLE "journal_entry_tags" (
	"user_id" text NOT NULL,
	"entry_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "journal_entry_tags_entry_id_tag_id_pk" PRIMARY KEY("entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "journal_entry_tasks" (
	"user_id" text NOT NULL,
	"entry_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	CONSTRAINT "journal_entry_tasks_entry_id_task_id_pk" PRIMARY KEY("entry_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_goals_status_check" CHECK ("weekly_goals"."status" in ('planned', 'in_progress', 'completed', 'dropped')),
	CONSTRAINT "weekly_goals_range_check" CHECK ("weekly_goals"."week_end_date" >= "weekly_goals"."week_start_date")
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid,
	"task_id" uuid,
	"project_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"summary" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before_data" jsonb,
	"after_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_used_by_user_id_user_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_imports" ADD CONSTRAINT "local_imports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_phases" ADD CONSTRAINT "task_phases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_phases" ADD CONSTRAINT "task_phases_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_phases" ADD CONSTRAINT "task_phases_task_type_fk" FOREIGN KEY ("workspace_id","task_type_id") REFERENCES "public"."task_types"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_fk" FOREIGN KEY ("user_id","workspace_id","depends_on_task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_phase_history" ADD CONSTRAINT "task_phase_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_phase_history" ADD CONSTRAINT "task_phase_history_task_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_plans" ADD CONSTRAINT "task_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_plans" ADD CONSTRAINT "task_plans_task_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_history" ADD CONSTRAINT "task_status_history_task_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_fk" FOREIGN KEY ("user_id","workspace_id","tag_id") REFERENCES "public"."tags"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_fk" FOREIGN KEY ("user_id","workspace_id","project_id") REFERENCES "public"."projects"("user_id","workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_fk" FOREIGN KEY ("user_id","workspace_id","parent_task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_type_fk" FOREIGN KEY ("workspace_id","task_type_id") REFERENCES "public"."task_types"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_fk" FOREIGN KEY ("workspace_id","status_id") REFERENCES "public"."task_statuses"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_fk" FOREIGN KEY ("workspace_id","phase_id") REFERENCES "public"."task_phases"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_phase_fk" FOREIGN KEY ("workspace_id","phase_id") REFERENCES "public"."task_phases"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry_audit" ADD CONSTRAINT "time_entry_audit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entry_audit" ADD CONSTRAINT "time_entry_audit_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_session_intervals" ADD CONSTRAINT "work_session_intervals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_session_intervals" ADD CONSTRAINT "work_session_intervals_session_id_work_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."work_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_phase_fk" FOREIGN KEY ("workspace_id","phase_id") REFERENCES "public"."task_phases"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_repository_fk" FOREIGN KEY ("user_id","workspace_id","repository_id") REFERENCES "public"."repositories"("user_id","workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_references" ADD CONSTRAINT "development_references_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_references" ADD CONSTRAINT "development_references_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_references" ADD CONSTRAINT "development_references_repository_fk" FOREIGN KEY ("user_id","workspace_id","repository_id") REFERENCES "public"."repositories"("user_id","workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_repositories" ADD CONSTRAINT "task_repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_repositories" ADD CONSTRAINT "task_repositories_task_fk" FOREIGN KEY ("user_id","workspace_id","task_id") REFERENCES "public"."tasks"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_repositories" ADD CONSTRAINT "task_repositories_repository_fk" FOREIGN KEY ("user_id","workspace_id","repository_id") REFERENCES "public"."repositories"("user_id","workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reviews" ADD CONSTRAINT "daily_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reviews" ADD CONSTRAINT "daily_reviews_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_project_fk" FOREIGN KEY ("user_id","workspace_id","project_id") REFERENCES "public"."projects"("user_id","workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_tags" ADD CONSTRAINT "journal_entry_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_tags" ADD CONSTRAINT "journal_entry_tags_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_tags" ADD CONSTRAINT "journal_entry_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_tasks" ADD CONSTRAINT "journal_entry_tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_tasks" ADD CONSTRAINT "journal_entry_tasks_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_tasks" ADD CONSTRAINT "journal_entry_tasks_task_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "public"."workspaces"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_task_fk" FOREIGN KEY ("user_id","task_id") REFERENCES "public"."tasks"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_code_unique" ON "invitations" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "local_imports_user_fingerprint_unique" ON "local_imports" USING btree ("user_id","fingerprint");--> statement-breakpoint
CREATE INDEX "rate_limit_key_idx" ON "rate_limit" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_owner_workspace_name_unique" ON "projects" USING btree ("user_id","workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "projects_owner_archived_idx" ON "projects" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_owner_workspace_name_unique" ON "tags" USING btree ("user_id","workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "task_phases_workspace_position_idx" ON "task_phases" USING btree ("workspace_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "task_statuses_workspace_name_unique" ON "task_statuses" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "task_statuses_one_initial_per_workspace" ON "task_statuses" USING btree ("workspace_id") WHERE "task_statuses"."is_initial" = true and "task_statuses"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "task_types_workspace_name_unique" ON "task_types" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_slug_unique" ON "workspaces" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "workspaces_owner_archived_idx" ON "workspaces" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_dependencies_unique" ON "task_dependencies" USING btree ("task_id","depends_on_task_id");--> statement-breakpoint
CREATE INDEX "task_dependencies_depends_on_idx" ON "task_dependencies" USING btree ("depends_on_task_id");--> statement-breakpoint
CREATE INDEX "task_phase_history_task_idx" ON "task_phase_history" USING btree ("task_id","changed_at");--> statement-breakpoint
CREATE INDEX "task_plans_owner_date_idx" ON "task_plans" USING btree ("user_id","planned_date");--> statement-breakpoint
CREATE INDEX "task_plans_task_idx" ON "task_plans" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_status_history_task_idx" ON "task_status_history" USING btree ("task_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_owner_number_unique" ON "tasks" USING btree ("user_id","task_number");--> statement-breakpoint
CREATE INDEX "tasks_owner_workspace_status_idx" ON "tasks" USING btree ("user_id","workspace_id","status_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_due_idx" ON "tasks" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_owner_planned_idx" ON "tasks" USING btree ("user_id","planned_date");--> statement-breakpoint
CREATE INDEX "tasks_owner_project_idx" ON "tasks" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_parent_idx" ON "tasks" USING btree ("user_id","parent_task_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_archived_idx" ON "tasks" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "time_entries_owner_date_idx" ON "time_entries" USING btree ("user_id","work_date");--> statement-breakpoint
CREATE INDEX "time_entries_task_idx" ON "time_entries" USING btree ("task_id","work_date");--> statement-breakpoint
CREATE INDEX "time_entries_owner_workspace_idx" ON "time_entries" USING btree ("user_id","workspace_id","work_date");--> statement-breakpoint
CREATE INDEX "time_entry_audit_entry_idx" ON "time_entry_audit" USING btree ("time_entry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "work_session_intervals_one_open_per_session" ON "work_session_intervals" USING btree ("session_id") WHERE "work_session_intervals"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "work_session_intervals_session_idx" ON "work_session_intervals" USING btree ("session_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "work_sessions_one_active_per_user" ON "work_sessions" USING btree ("user_id") WHERE "work_sessions"."status" in ('running', 'paused');--> statement-breakpoint
CREATE INDEX "work_sessions_owner_started_idx" ON "work_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "work_sessions_task_idx" ON "work_sessions" USING btree ("task_id","started_at");--> statement-breakpoint
CREATE INDEX "work_sessions_owner_workspace_idx" ON "work_sessions" USING btree ("user_id","workspace_id","started_at");--> statement-breakpoint
CREATE INDEX "delivery_records_owner_env_idx" ON "delivery_records" USING btree ("user_id","environment","delivered_at");--> statement-breakpoint
CREATE INDEX "delivery_records_task_idx" ON "delivery_records" USING btree ("task_id","delivered_at");--> statement-breakpoint
CREATE INDEX "delivery_records_owner_workspace_idx" ON "delivery_records" USING btree ("user_id","workspace_id","delivered_at");--> statement-breakpoint
CREATE INDEX "development_references_task_idx" ON "development_references" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_owner_workspace_name_unique" ON "repositories" USING btree ("user_id","workspace_id",lower("name"));--> statement-breakpoint
CREATE INDEX "task_repositories_task_idx" ON "task_repositories" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_repositories_repository_idx" ON "task_repositories" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reviews_owner_date_workspace_unique" ON "daily_reviews" USING btree ("user_id","review_date",coalesce("workspace_id", '00000000-0000-0000-0000-000000000000'::uuid));--> statement-breakpoint
CREATE INDEX "journal_entries_owner_date_idx" ON "journal_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "journal_entries_owner_workspace_idx" ON "journal_entries" USING btree ("user_id","workspace_id","entry_date");--> statement-breakpoint
CREATE INDEX "weekly_goals_owner_week_idx" ON "weekly_goals" USING btree ("user_id","week_start_date");--> statement-breakpoint
CREATE INDEX "activity_events_owner_time_idx" ON "activity_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_owner_workspace_time_idx" ON "activity_events" USING btree ("user_id","workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_task_time_idx" ON "activity_events" USING btree ("task_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_project_time_idx" ON "activity_events" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_events_owner_type_idx" ON "activity_events" USING btree ("user_id","event_type");--> statement-breakpoint
CREATE INDEX "audit_logs_owner_time_idx" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");