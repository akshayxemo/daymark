# Daymark — Product Requirements & Technical Architecture

PRODUCT SPECIFICATION · VERSION 1.0 · NOVEMBER 2026

# Daymark

## Personal Work & Life Intelligence

[Finova – Smart Productivity Dashboard UI by Rafeul Haque Rafe on Dribbble](https://images.openai.com/static-rsc-4/kub_vXhAYZD1lri0tAsIG-7netNzTBqn53GYS1HWxb1IJbuc4bHTT7jn6va8lk5sCC5fxaSiLJZAi5QcmQoEZ7JVBtDlaIIu_qNtVg8V0tjLmi4NmQXwS_K8AfklNGS-_hDtzo48C4QfmmN_NlDo6BLEru5xjUU0dvwSwqJzaIA?purpose=inline)

[dribbble.com](https://dribbble.com/shots/27405014-Finova-Smart-Productivity-Dashboard-UI)

Open source

Self-host first

Cloud-ready

Multi-user

Modular monolith

A personal productivity and activity intelligence platform that records what you planned, what you worked on, how your work progressed, how much time you invested, and what you actually delivered.

This document defines the product requirements, architecture, database model, modules, workflows, analytics, deployment strategy and implementation roadmap.

It will be our reference specification while developing the application. We should avoid changing the core architecture unnecessarily once implementation begins.

# 1. Product definition

## 1.1 Vision

Daymark is an open-source, self-hostable application that combines personal task management, professional work tracking, time tracking, development activity records and productivity analytics into one unified platform.

It should be useful for:

- Software engineers tracking development activities.
- Professionals managing office responsibilities.
- Individuals organizing personal tasks and goals.
- Students tracking learning and projects.
- Freelancers tracking projects and time.
- Anyone who wants a historical record of how they spend their time.

## 1.2 Product principles

These principles should guide every implementation decision.

| Principle           | Requirement                                              |
| ------------------- | -------------------------------------------------------- |
| Personal-first      | The user controls their own data.                        |
| Unified experience  | Multiple workspaces, one dashboard.                      |
| Historical accuracy | Important changes must be recorded.                      |
| Configurable        | Users define their own workflows.                        |
| Offline-independent | Core functionality must not depend on external services. |
| Self-hostable       | Full functionality through local deployment.             |
| Cloud-ready         | Architecture must support hosted deployment later.       |
| Privacy-first       | No mandatory telemetry or external integrations.         |
| Outcome-oriented    | Measure delivered work, not just activity.               |

## 1.3 Product boundaries

Daymark is not intended to become:

- A Jira replacement.
- A GitHub replacement.
- A team project-management suite.
- A generic note-taking application.
- An employee monitoring or surveillance application.
- A mandatory AI-powered productivity platform.

It should integrate references to these external systems manually, without depending on them.

# 2. Application organization



Selected architecture

&#x20;Hybrid workspace organization



The application will support multiple independent workspaces and a unified cross-workspace experience.

## 2.1 Workspace model

User account

Personal data owner

Office

Professional activities

Projects

Tasks

Repositories

Jira references

Deliveries

Personal

Personal activities

Projects

Daily tasks

Goals

Habits

Notes

Learning

Learning and development

Learning goals

Study tasks

Projects

Custom spaces

User-defined workspaces

Custom projects

Custom workflows

Custom categories

Unified dashboard

Aggregates selected workspaces without merging their underlying data.

### Workspace rules

1. Every task belongs to exactly one workspace.
2. Every workspace belongs to one user in the initial version.
3. Projects belong to workspaces.
4. Users can view selected workspaces together through the dashboard.
5. Workspace-specific settings can define task types, phases and statuses.
6. Users can create, archive and customize workspaces.
7. Cross-workspace analytics must respect workspace visibility and filters.

Important: A workspace is not an account or organization. It is a way to organize an individual user's activities.

## 2.2 Account and installation modes

Support two deployment experiences:

| Mode        | Behaviour                                                      |
| ----------- | -------------------------------------------------------------- |
| Single-user | One user, simplified initial setup, private data               |
| Multi-user  | Multiple independent accounts, isolated workspaces and records |

Both modes use the same application and database schema.

Single-user mode should be a deployment configuration, not a separate application or a different data model.

For the initial version, multi-user means multiple independent users, not collaborative teams or shared workspaces. Team collaboration can be introduced later without changing the basic personal ownership model.

# 3. Functional requirements and application modules

The application will have 11 primary modules.

| Module                   | Priority | MVP            |
| ------------------------ | -------- | -------------- |
| Overview Dashboard       | P0       | Yes            |
| Workspace Management     | P0       | Yes            |
| Task Management          | P0       | Yes            |
| Daily & Weekly Planner   | P0       | Yes            |
| Time Tracking            | P0       | Yes            |
| Development Tracking     | P0       | Yes            |
| Activity Timeline        | P0       | Yes            |
| Journal & Notes          | P1       | Yes, basic     |
| Analytics & Reports      | P0       | Yes, basic     |
| Settings & Customization | P1       | Yes, essential |
| Backup & Export          | P1       | Yes            |

The MVP is deliberately broader than a basic task manager. It should already solve the central problem when the first public release is available.

## 3.1 Overview Dashboard

Purpose: Provide a complete picture of current activities and progress.

Required widgets:

- Today's planned tasks.
- Completed tasks.
- Active task and timer.
- Tasks requiring attention.
- Weekly completion rate.
- Tracked hours.
- Workspace time distribution.
- Production deliveries.
- Recent activity.
- Upcoming deadlines.
- Weekly goals.

Dashboard controls:

- Workspace filter.
- Date range.
- Widget visibility.
- Default dashboard configuration.
- Combined or workspace-specific view.

## 3.2 Workspace Management

Required capabilities:

- Create, edit and archive workspaces.
- Set workspace name, description and icon.
- Configure workspace color.
- Configure default task types.
- Configure statuses and phases.
- Configure working days and hours.
- Set workspace timezone or inherit account timezone.
- Archive without deleting historical data.

## 3.3 Task Management

This is the central domain module.

### Task fields

| Field              | Type              | Required  |
| ------------------ | ----------------- | --------- |
| Title              | Text              | Yes       |
| Description        | Markdown          | No        |
| Workspace          | Relation          | Yes       |
| Project            | Relation          | No        |
| Task type          | Configurable enum | Yes       |
| Priority           | Configurable enum | Yes       |
| Status             | Configurable enum | Yes       |
| Phase              | Configurable enum | No        |
| Planned start      | Date/time         | No        |
| Due date           | Date/time         | No        |
| Estimated duration | Integer minutes   | No        |
| Tags               | Relation          | No        |
| Parent task        | Self-relation     | No        |
| Created at         | Timestamp         | Automatic |
| Updated at         | Timestamp         | Automatic |
| Completed at       | Timestamp         | Automatic |

Additional capabilities:

- Subtasks.
- Task dependencies.
- Task duplication.
- Quick capture.
- Task templates.
- Recurring tasks (post-MVP enhancement).
- Carryover between planning periods.
- Manual status transitions.
- Search, filtering and sorting.
- Archive and restore.

### Task types

Initial defaults:

- Development.
- Bug Fix.
- Research.
- Testing.
- Meeting.
- Documentation.
- Administration.
- Learning.
- Personal.
- Other.

Users can customize these.

### Task status model

The application should provide default statuses:

| Status      | Category    |
| ----------- | ----------- |
| Backlog     | Not started |
| Planned     | Not started |
| In Progress | Active      |
| On Hold     | Paused      |
| Blocked     | Waiting     |
| Completed   | Done        |
| Cancelled   | Closed      |

Do not hardcode these statuses into frontend logic. Store their definitions in the database.

A status should also have configurable attributes such as:

- `is_terminal`
- `is_active`
- `counts_as_completed`
- `stops_timer`

This enables users to create custom statuses later.

## 3.4 Implementation phase management

Statuses and phases are separate concepts.

Status answers:

What is the current state of the task?

Phase answers:

Which stage of execution is this task currently in?

Default development phases:

1. Requirement Analysis
2. Technical Planning
3. Development
4. Code Review
5. QA / Testing
6. UAT
7. Deployment
8. Production Verification
9. Completed

Users should be able to configure phases for different task types.

Every phase transition must record:

- Previous phase.
- New phase.
- Changed by.
- Timestamp.
- Optional explanation.

A task can move from Development to Code Review and back to Development without losing its previous phase history.

## 3.5 Daily & Weekly Planner

### Daily planner

- Select date.
- View scheduled tasks.
- Create tasks directly.
- Assign priorities.
- View estimated workload.
- View actual tracked effort.
- Carry tasks forward.
- View completed tasks.
- Add daily notes.
- Perform end-of-day review.

### Weekly planner

- Define weekly goals.
- Allocate tasks across days.
- See workload distribution.
- View planned versus completed tasks.
- Identify carried-over work.
- Compare planned and actual hours.
- Review the week.

The planner must preserve original planning information. Moving a task should not erase when it was originally planned.

## 3.6 Time Tracking

Required functionality:

- Start timer.
- Pause timer.
- Resume timer.
- Stop timer.
- Manual time entry.
- Edit recorded time with audit history.
- Add session descriptions.
- Associate a session with a task.
- Associate a session with an implementation phase.
- View daily, weekly and monthly totals.

Rules:

1. One active timer per user across all workspaces.
2. Paused time must not count as active effort.
3. Task status changes to a timer-stopping status must stop the active timer.
4. Manual entries must be distinguishable from timer entries.
5. Overlapping time records must be rejected or explicitly reconciled.
6. A timer should be calculated using persisted start and pause/resume timestamps, not an in-memory browser counter.
7. Refreshing or reopening the application must not lose an active timer.

## 3.7 Development Tracking

This is a specialized module for software engineers.

### Repository management

A repository record should contain:

- Repository name.
- Repository URL.
- Provider name (GitHub, GitLab, Bitbucket, other).
- Organization or owner.
- Default branch.
- Description.
- Workspace association.
- Archived state.

### Task development references

A task can reference multiple repositories.

For each repository relationship, support:

- Repository.
- Codebase/module.
- Branch name.
- Branch URL (optional).
- Development notes.
- Work status.

### External references

Allow optional references to:

- Jira ticket ID and URL.
- Pull request URL and ID.
- Commit SHA and URL.
- Issue tracker URL.
- Documentation URL.
- Other external references.

No external API calls are necessary.

### Delivery records

A task may have multiple delivery records.

| Field         | Purpose                               |
| ------------- | ------------------------------------- |
| Task          | Related task                          |
| Repository    | Related codebase                      |
| Delivery type | Merge, deployment, verification       |
| Environment   | Development, Staging, UAT, Production |
| Reference URL | PR or deployment URL                  |
| Version       | Optional release version              |
| Branch        | Optional release branch               |
| Status        | Pending, successful, failed           |
| Timestamp     | When it happened                      |
| Notes         | Additional context                    |

This allows us to distinguish implementation completion from actual delivery.

## 3.8 Activity Timeline

Every important action creates an event.

Examples:

- Task created.
- Status changed.
- Phase changed.
- Priority changed.
- Deadline changed.
- Time entry created.
- Time entry edited.
- Timer started or stopped.
- Repository linked.
- Branch changed.
- Delivery recorded.
- Task completed.
- Task carried forward.

The timeline should support:

- Global chronological view.
- Task-specific timeline.
- Project-specific timeline.
- Workspace-specific timeline.
- Date range filtering.
- Event-type filtering.

Activity records must be append-only from the application's normal user interface. Corrections should be represented by additional audit events rather than silently rewriting the past.

## 3.9 Journal & Notes

The journal is intentionally lightweight.

Each entry supports:

- Date.
- Workspace.
- Title.
- Markdown content.
- Tags.
- Related tasks.
- Related projects.
- Entry type.

Entry types:

- Daily Review.
- Technical Note.
- Personal Note.
- Meeting Note.
- Learning Note.
- Achievement.
- Blocker.
- General.

## 3.10 Analytics & Reports

Analytics should be calculated from structured records.

Required reports:

- Daily activity.
- Weekly activity.
- Monthly activity.
- Task completion.
- Workspace distribution.
- Project distribution.
- Time distribution.
- Estimated versus actual effort.
- Carryover trends.
- Task cycle time.
- Production delivery count.
- Phase distribution.

## 3.11 Settings & Data Management

- Profile settings.
- Timezone.
- Date and time format.
- Week start day.
- Theme.
- Workspace defaults.
- Task statuses.
- Task phases.
- Task types.
- Priorities.
- Tags.
- Export data.
- Backup and restore.
- Account deletion.

# 4. Detailed database architecture



Architecture decision

&#x20;PostgreSQL with Drizzle ORM.



I recommend a relational database because tasks, sessions, repositories, phases, status transitions and delivery records have well-defined relationships.

We should avoid embedding the entire task lifecycle in JSON fields.

## 4.1 Database conventions

Use these conventions throughout:

- Primary keys: UUID.
- Timestamps: `TIMESTAMPTZ`, stored in UTC.
- Duration: integer minutes or seconds, not floating-point hours.
- Currency: not needed in MVP.
- User-owned data: `user_id` ownership.
- Foreign keys: enforced at database level.
- Soft deletion: for workspaces, projects and tasks where historical preservation matters.
- Event history: append-only.
- Database migrations: version-controlled.

For all user-owned records, ensure the database relationships prevent cross-user references. A user must not be able to associate their task with another user's project or repository.

## 4.2 Entity groups

A. Identity and configuration

`users` · `user_settings` · `workspaces` · `workspace_settings`

B. Organization

`projects` · `tags` · `task_tags` · `task_types` · `task_statuses` · `task_phases`

C. Task management

`tasks` · `task_dependencies` · `task_status_history` · `task_phase_history` · `task_plans`

D. Time tracking

`work_sessions` · `time_entries` · `time_entry_audit`

E. Developer tracking

`repositories` · `task_repositories` · `development_references` · `delivery_records`

F. Productivity and journaling

`weekly_goals` · `daily_reviews` · `journal_entries`

G. Historical records

`activity_events` · `audit_logs`

## 4.3 Core database schema

Below is the logical schema. It defines the important columns and relationships; exact SQL types, constraints and indexes will be finalized in migrations.

### Identity and workspace tables

users

| Column         | Type           |
| -------------- | -------------- |
| id             | UUID PK        |
| email          | VARCHAR UNIQUE |
| password_hash  | TEXT           |
| display_name   | VARCHAR        |
| avatar_url     | TEXT nullable  |
| account_status | VARCHAR        |
| created_at     | TIMESTAMPTZ    |
| updated_at     | TIMESTAMPTZ    |

user_settings

| Column               | Type          |
| -------------------- | ------------- |
| user_id              | UUID PK/FK    |
| timezone             | VARCHAR       |
| date_format          | VARCHAR       |
| time_format          | VARCHAR       |
| week_starts_on       | SMALLINT      |
| theme                | VARCHAR       |
| default_workspace_id | UUID nullable |

workspaces

| Column      | Type        |
| ----------- | ----------- |
| id          | UUID PK     |
| user_id     | UUID FK     |
| name        | VARCHAR     |
| slug        | VARCHAR     |
| description | TEXT        |
| icon        | VARCHAR     |
| color       | VARCHAR     |
| is_default  | BOOLEAN     |
| is_archived | BOOLEAN     |
| created_at  | TIMESTAMPTZ |
| updated_at  | TIMESTAMPTZ |

workspace_settings

| Column                | Type             |
| --------------------- | ---------------- |
| id                    | UUID PK          |
| workspace_id          | UUID FK          |
| working_days          | JSONB            |
| working_hours_per_day | DECIMAL          |
| timezone              | VARCHAR nullable |
| configuration         | JSONB            |

Use JSONB only for flexible configuration, not for relational business entities.

### Project and task tables

projects

| Column       | Type                 |
| ------------ | -------------------- |
| id           | UUID PK              |
| user_id      | UUID FK              |
| workspace_id | UUID FK              |
| name         | VARCHAR              |
| description  | TEXT                 |
| status       | VARCHAR              |
| start_date   | DATE nullable        |
| due_date     | DATE nullable        |
| archived_at  | TIMESTAMPTZ nullable |
| created_at   | TIMESTAMPTZ          |

tasks

| Column                     | Type                 |
| -------------------------- | -------------------- |
| id                         | UUID PK              |
| user_id                    | UUID FK              |
| workspace_id               | UUID FK              |
| project_id                 | UUID FK nullable     |
| parent_task_id             | UUID FK nullable     |
| title                      | VARCHAR              |
| description                | TEXT                 |
| task_type_id               | UUID FK              |
| status_id                  | UUID FK              |
| phase_id                   | UUID FK nullable     |
| priority                   | VARCHAR              |
| estimated_duration_minutes | INTEGER nullable     |
| planned_start_at           | TIMESTAMPTZ nullable |
| due_at                     | TIMESTAMPTZ nullable |
| completed_at               | TIMESTAMPTZ nullable |
| position                   | INTEGER              |
| created_at                 | TIMESTAMPTZ          |
| updated_at                 | TIMESTAMPTZ          |
| archived_at                | TIMESTAMPTZ nullable |

task_statuses

| Column              | Type    |
| ------------------- | ------- |
| id                  | UUID PK |
| workspace_id        | UUID FK |
| name                | VARCHAR |
| category            | VARCHAR |
| is_initial          | BOOLEAN |
| is_terminal         | BOOLEAN |
| counts_as_completed | BOOLEAN |
| stops_timer         | BOOLEAN |
| position            | INTEGER |

task_phases

| Column       | Type          |
| ------------ | ------------- |
| id           | UUID PK       |
| workspace_id | UUID FK       |
| name         | VARCHAR       |
| task_type_id | UUID nullable |
| position     | INTEGER       |
| is_active    | BOOLEAN       |

task_status_history

| Column             | Type          |
| ------------------ | ------------- |
| id                 | UUID PK       |
| user_id            | UUID FK       |
| task_id            | UUID FK       |
| previous_status_id | UUID nullable |
| new_status_id      | UUID FK       |
| reason             | TEXT nullable |
| changed_at         | TIMESTAMPTZ   |

task_phase_history

| Column            | Type          |
| ----------------- | ------------- |
| id                | UUID PK       |
| user_id           | UUID FK       |
| task_id           | UUID FK       |
| previous_phase_id | UUID nullable |
| new_phase_id      | UUID FK       |
| notes             | TEXT nullable |
| changed_at        | TIMESTAMPTZ   |

task_dependencies

| Column             | Type        |
| ------------------ | ----------- |
| id                 | UUID PK     |
| task_id            | UUID FK     |
| depends_on_task_id | UUID FK     |
| dependency_type    | VARCHAR     |
| created_at         | TIMESTAMPTZ |

Dependency types initially: `blocks`, `blocked_by` should be represented consistently through one directional relationship, avoiding duplicate reciprocal records.

task_plans

This is important for planning accuracy.

| Column                   | Type             |
| ------------------------ | ---------------- |
| id                       | UUID PK          |
| user_id                  | UUID FK          |
| task_id                  | UUID FK          |
| planned_date             | DATE             |
| planned_duration_minutes | INTEGER nullable |
| planning_period          | VARCHAR          |
| position                 | INTEGER          |
| created_at               | TIMESTAMPTZ      |

A task may have multiple planning records over time. This lets us retain the original plan when work is moved to another day.

### Time tracking tables

work_sessions

| Column           | Type                 |
| ---------------- | -------------------- |
| id               | UUID PK              |
| user_id          | UUID FK              |
| task_id          | UUID FK              |
| phase_id         | UUID nullable        |
| started_at       | TIMESTAMPTZ          |
| ended_at         | TIMESTAMPTZ nullable |
| status           | VARCHAR              |
| duration_seconds | BIGINT               |
| description      | TEXT nullable        |
| source           | VARCHAR              |
| created_at       | TIMESTAMPTZ          |

Statuses: `running`, `paused`, `completed`, `cancelled`.

time_entries

For manually entered time.

| Column           | Type                 |
| ---------------- | -------------------- |
| id               | UUID PK              |
| user_id          | UUID FK              |
| task_id          | UUID FK              |
| phase_id         | UUID nullable        |
| started_at       | TIMESTAMPTZ nullable |
| ended_at         | TIMESTAMPTZ nullable |
| duration_seconds | BIGINT               |
| work_date        | DATE                 |
| description      | TEXT                 |
| created_at       | TIMESTAMPTZ          |

time_entry_audit

Stores previous and updated values when manual entries are edited or deleted.

Important implementation detail: timer sessions and manual entries must be separately identifiable. Reports can aggregate both, but must not count the same time twice.

### Development tables

repositories

| Column         | Type                 |
| -------------- | -------------------- |
| id             | UUID PK              |
| user_id        | UUID FK              |
| workspace_id   | UUID FK              |
| name           | VARCHAR              |
| owner          | VARCHAR nullable     |
| provider       | VARCHAR              |
| repository_url | TEXT                 |
| default_branch | VARCHAR nullable     |
| description    | TEXT nullable        |
| archived_at    | TIMESTAMPTZ nullable |

task_repositories

| Column        | Type             |
| ------------- | ---------------- |
| id            | UUID PK          |
| task_id       | UUID FK          |
| repository_id | UUID FK          |
| codebase_name | VARCHAR nullable |
| branch_name   | VARCHAR nullable |
| branch_url    | TEXT nullable    |
| notes         | TEXT nullable    |
| created_at    | TIMESTAMPTZ      |

development_references

| Column         | Type             |
| -------------- | ---------------- |
| id             | UUID PK          |
| task_id        | UUID FK          |
| repository_id  | UUID nullable    |
| reference_type | VARCHAR          |
| reference_id   | VARCHAR nullable |
| title          | VARCHAR nullable |
| url            | TEXT             |
| created_at     | TIMESTAMPTZ      |

Reference types: Jira, Pull Request, Commit, Issue, Documentation, Other.

delivery_records

| Column          | Type                 |
| --------------- | -------------------- |
| id              | UUID PK              |
| user_id         | UUID FK              |
| task_id         | UUID FK              |
| repository_id   | UUID FK nullable     |
| delivery_type   | VARCHAR              |
| environment     | VARCHAR              |
| delivery_status | VARCHAR              |
| branch_name     | VARCHAR nullable     |
| version         | VARCHAR nullable     |
| reference_url   | TEXT nullable        |
| delivered_at    | TIMESTAMPTZ nullable |
| notes           | TEXT nullable        |
| created_at      | TIMESTAMPTZ          |

Delivery types: `merged`, `deployed`, `verified`.

Environments: `development`, `staging`, `uat`, `production`, `other`.

### Journaling and planning tables

weekly_goals

| Column          | Type        |
| --------------- | ----------- |
| id              | UUID PK     |
| user_id         | UUID FK     |
| workspace_id    | UUID FK     |
| title           | VARCHAR     |
| description     | TEXT        |
| week_start_date | DATE        |
| week_end_date   | DATE        |
| status          | VARCHAR     |
| created_at      | TIMESTAMPTZ |

daily_reviews

| Column              | Type          |
| ------------------- | ------------- |
| id                  | UUID PK       |
| user_id             | UUID FK       |
| workspace_id        | UUID nullable |
| review_date         | DATE          |
| accomplishments     | TEXT          |
| blockers            | TEXT          |
| learnings           | TEXT          |
| tomorrow_priorities | TEXT          |
| created_at          | TIMESTAMPTZ   |
| updated_at          | TIMESTAMPTZ   |

journal_entries

| Column       | Type          |
| ------------ | ------------- |
| id           | UUID PK       |
| user_id      | UUID FK       |
| workspace_id | UUID FK       |
| project_id   | UUID nullable |
| title        | VARCHAR       |
| content      | TEXT          |
| entry_type   | VARCHAR       |
| entry_date   | DATE          |
| created_at   | TIMESTAMPTZ   |
| updated_at   | TIMESTAMPTZ   |

### Historical records

activity_events

| Column       | Type          |
| ------------ | ------------- |
| id           | UUID PK       |
| user_id      | UUID FK       |
| workspace_id | UUID nullable |
| task_id      | UUID nullable |
| event_type   | VARCHAR       |
| entity_type  | VARCHAR       |
| entity_id    | UUID nullable |
| summary      | TEXT          |
| metadata     | JSONB         |
| occurred_at  | TIMESTAMPTZ   |

audit_logs

| Column      | Type           |
| ----------- | -------------- |
| id          | UUID PK        |
| user_id     | UUID FK        |
| action      | VARCHAR        |
| entity_type | VARCHAR        |
| entity_id   | UUID           |
| before_data | JSONB nullable |
| after_data  | JSONB nullable |
| created_at  | TIMESTAMPTZ    |

The activity timeline is intended for user-facing history. Audit logs capture sensitive changes and corrections. These should not be treated as interchangeable.

## 4.4 Important database constraints and indexes

These are non-negotiable implementation requirements.

- Index tasks by `(user_id, workspace_id, status_id)`.
- Index tasks by `(user_id, due_at)`.
- Index task plans by `(user_id, planned_date)`.
- Index status history by `(task_id, changed_at)`.
- Index phase history by `(task_id, changed_at)`.
- Index work sessions by `(user_id, started_at)`.
- Index activity events by `(user_id, occurred_at)`.
- Index delivery records by `(user_id, environment, delivered_at)`.
- Enforce one active timer per user with a partial unique index.
- Prevent duplicate task dependencies.
- Prevent a task from depending on itself.
- Prevent dependency cycles at the application/domain layer.
- Enforce ownership across related records using composite foreign keys or equivalent transactional validation.

### Timer concurrency

A database constraint should enforce that a user cannot accidentally start two timers from different browser tabs.

Conceptually:

```
CREATE UNIQUE INDEX one_running_timer_per_user
ON work_sessions (user_id)
WHERE status = 'running';
```

This is only part of the timer implementation; paused sessions must also be handled consistently when calculating elapsed time.

## 4.5 Task lifecycle transaction

Whenever a task changes status or phase:

1. Validate the new state.
2. Read the previous state.
3. Update the task.
4. Insert the corresponding history record.
5. Insert an activity event.
6. Insert an audit record when applicable.
7. Stop the timer if the destination status requires it.
8. Commit everything in one database transaction.

If any operation fails, the transaction must roll back.

This prevents a situation where the task shows Completed but its history says In Progress.

# 5. Application architecture

## 5.1 Technology stack

I recommend the following stack as the baseline.

| Layer            | Technology                       | Responsibility              |
| ---------------- | -------------------------------- | --------------------------- |
| Frontend         | Next.js App Router               | Application UI              |
| Language         | TypeScript                       | Type safety                 |
| UI               | Tailwind CSS                     | Styling                     |
| Components       | shadcn/ui                        | Component library           |
| Icons            | Lucide                           | Icons                       |
| Forms            | React Hook Form                  | Form state                  |
| Validation       | Zod                              | Input validation            |
| Server state     | TanStack Query                   | Client-side server data     |
| Database         | PostgreSQL                       | Persistent storage          |
| ORM              | Drizzle ORM                      | Database queries            |
| Authentication   | Better Auth                      | Sessions and authentication |
| Charts           | Recharts                         | Analytics                   |
| Markdown         | MDX-compatible editor / Markdown | Journal and descriptions    |
| Testing          | Vitest + Playwright              | Unit and E2E testing        |
| Containerization | Docker                           | Deployment                  |
| CI               | GitHub Actions                   | Automated checks            |

Why PostgreSQL rather than MongoDB?

The application has a strongly relational domain. You will frequently need to calculate relationships between tasks, workspaces, sessions, phases, planned periods and deliveries.

PostgreSQL will make these operations easier to maintain and report on.

## 5.2 Architectural pattern



Recommended

&#x20;Modular monolith.



Do not start with microservices.

The application is sufficiently complex to require clear module boundaries, but not distributed infrastructure.

\#chatgpt-mermaid-\_r_1ck\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1ck\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1ck\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1ck\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1ck\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1ck\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1ck\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1ck\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1ck\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1ck\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ck\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ck\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1ck\_ p{margin:0;}#chatgpt-mermaid-\_r_1ck\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1ck\_ .label text,#chatgpt-mermaid-\_r_1ck\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ .node rect,#chatgpt-mermaid-\_r_1ck\_ .node circle,#chatgpt-mermaid-\_r_1ck\_ .node ellipse,#chatgpt-mermaid-\_r_1ck\_ .node polygon,#chatgpt-mermaid-\_r_1ck\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .rough-node .label text,#chatgpt-mermaid-\_r_1ck\_ .node .label text,#chatgpt-mermaid-\_r_1ck\_ .image-shape .label,#chatgpt-mermaid-\_r_1ck\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1ck\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .rough-node .label,#chatgpt-mermaid-\_r_1ck\_ .node .label,#chatgpt-mermaid-\_r_1ck\_ .image-shape .label,#chatgpt-mermaid-\_r_1ck\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1ck\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1ck\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ck\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ck\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1ck\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1ck\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1ck\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1ck\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1ck\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1ck\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ck\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1ck\_ .icon-shape,#chatgpt-mermaid-\_r_1ck\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1ck\_ .icon-shape p,#chatgpt-mermaid-\_r_1ck\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1ck\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1ck\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1ck\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1ck\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1ck\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1ck\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1ck\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1ck\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1ck\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ck\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1ck\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ck\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1ck\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1ck\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1ck\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1ck\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .node rect,#chatgpt-mermaid-\_r_1ck\_ .node circle,#chatgpt-mermaid-\_r_1ck\_ .node ellipse,#chatgpt-mermaid-\_r_1ck\_ .node polygon,#chatgpt-mermaid-\_r_1ck\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1ck\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1ck\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1ck\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1ck\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ck\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}InfrastructureApplication DomainNext.js ApplicationDrizzle ORMPostgreSQLDatabase MigrationsBackup and RestoreIdentityWorkspaceTask ManagementPlanningTime TrackingDevelopment TrackingJournalAnalyticsActivity and AuditDashboard and UIRoute HandlersShared ComponentsUser / Browser

## 5.3 Proposed project structure

I recommend a modular folder structure within a single Next.js application.

```
daymark/
│
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── overview/
│       │   │   │   ├── my-day/
│       │   │   │   ├── planner/
│       │   │   │   ├── tasks/
│       │   │   │   ├── projects/
│       │   │   │   ├── development/
│       │   │   │   ├── time/
│       │   │   │   ├── activity/
│       │   │   │   ├── journal/
│       │   │   │   ├── analytics/
│       │   │   │   └── settings/
│       │   │   └── api/
│       │   │
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   ├── layout/
│       │   │   └── shared/
│       │   │
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── workspaces/
│       │   │   ├── projects/
│       │   │   ├── tasks/
│       │   │   ├── planner/
│       │   │   ├── time-tracking/
│       │   │   ├── development/
│       │   │   ├── journal/
│       │   │   ├── analytics/
│       │   │   └── activity/
│       │   │
│       │   ├── lib/
│       │   │   ├── auth/
│       │   │   ├── database/
│       │   │   ├── validation/
│       │   │   └── utils/
│       │   │
│       │   └── styles/
│       │
│       └── tests/
│
├── packages/
│   ├── database/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── seed/
│   │
│   └── shared/
│       ├── types/
│       ├── constants/
│       └── validation/
│
├── docker/
├── docs/
├── scripts/
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
└── README.md
```

Each module should contain its own:

- Components.
- Schemas.
- Domain types.
- Service functions.
- Database queries.
- Validation.
- Tests.

For example:

```
modules/tasks/
├── components/
├── schemas/
├── services/
│   ├── create-task.ts
│   ├── update-task.ts
│   ├── change-task-status.ts
│   └── change-task-phase.ts
├── queries/
├── types/
└── tests/
```

Keep business logic outside React components and API route handlers.

## 5.4 Backend API design

Use versioned REST endpoints.

Base path:

```
/api/v1
```

Example endpoints:

| Method | Endpoint              | Purpose             |
| ------ | --------------------- | ------------------- |
| GET    | `/workspaces`         | List workspaces     |
| POST   | `/workspaces`         | Create workspace    |
| GET    | `/tasks`              | Search tasks        |
| POST   | `/tasks`              | Create task         |
| PATCH  | `/tasks/:id`          | Update task         |
| POST   | `/tasks/:id/status`   | Change status       |
| POST   | `/tasks/:id/phase`    | Change phase        |
| GET    | `/tasks/:id/history`  | Task history        |
| POST   | `/time/start`         | Start timer         |
| POST   | `/time/pause`         | Pause timer         |
| POST   | `/time/resume`        | Resume timer        |
| POST   | `/time/stop`          | Stop timer          |
| POST   | `/time/manual`        | Add manual entry    |
| GET    | `/planner/day`        | Daily plan          |
| GET    | `/planner/week`       | Weekly plan         |
| GET    | `/analytics/overview` | Dashboard analytics |
| GET    | `/activity`           | Activity timeline   |
| POST   | `/deliveries`         | Record delivery     |
| GET    | `/exports`            | Export data         |

Use Zod schemas for request validation and enforce authentication and record ownership in every relevant operation.

## 5.5 Authentication and authorization

For the first version:

- Email and password authentication.
- Secure password hashing through the authentication library.
- Session-based authentication.
- Secure, HTTP-only cookies.
- Account registration controls.
- Password reset.
- Logout.
- Account deletion.

For multi-user self-hosted installations:

- Initial administrator setup.
- Configurable public registration.
- Optional invitation-only registration.
- Independent user accounts.
- Strict user-level data isolation.

For cloud deployment:

- Registration and account lifecycle management.
- Optional subscription or billing layer later.
- Tenant-aware quotas if needed.

Do not introduce a separate role-per-workspace permission system in the MVP. A personal ownership model is sufficient.

## 5.6 Security architecture

This is especially important because the application may store professional information.

Requirements:

1. All user-owned records must be scoped by authenticated user.
2. Validate ownership on both parent and child relationships.
3. Never trust a client-supplied `user_id`.
4. Enforce database foreign-key constraints.
5. Use parameterized database queries.
6. Rate-limit authentication endpoints.
7. Protect against CSRF where applicable.
8. Secure session management.
9. Validate all imported data.
10. Keep secrets in environment variables.
11. No public access to personal activity records.
12. No telemetry by default.

For office use, provide a warning against recording sensitive patient data, credentials, proprietary source code or confidential company information.

# 6. Main user flows

These workflows define how the application should behave, not just what screens should exist.

## Flow A: First-time installation

\#chatgpt-mermaid-\_r_1df\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1df\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1df\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1df\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1df\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1df\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1df\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1df\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1df\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1df\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1df\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1df\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1df\_ p{margin:0;}#chatgpt-mermaid-\_r_1df\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1df\_ .label text,#chatgpt-mermaid-\_r_1df\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ .node rect,#chatgpt-mermaid-\_r_1df\_ .node circle,#chatgpt-mermaid-\_r_1df\_ .node ellipse,#chatgpt-mermaid-\_r_1df\_ .node polygon,#chatgpt-mermaid-\_r_1df\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .rough-node .label text,#chatgpt-mermaid-\_r_1df\_ .node .label text,#chatgpt-mermaid-\_r_1df\_ .image-shape .label,#chatgpt-mermaid-\_r_1df\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1df\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .rough-node .label,#chatgpt-mermaid-\_r_1df\_ .node .label,#chatgpt-mermaid-\_r_1df\_ .image-shape .label,#chatgpt-mermaid-\_r_1df\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1df\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1df\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1df\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1df\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1df\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1df\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1df\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1df\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1df\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1df\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1df\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1df\_ .icon-shape,#chatgpt-mermaid-\_r_1df\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1df\_ .icon-shape p,#chatgpt-mermaid-\_r_1df\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1df\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1df\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1df\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1df\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1df\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1df\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1df\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1df\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1df\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1df\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1df\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1df\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1df\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1df\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1df\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1df\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .node rect,#chatgpt-mermaid-\_r_1df\_ .node circle,#chatgpt-mermaid-\_r_1df\_ .node ellipse,#chatgpt-mermaid-\_r_1df\_ .node polygon,#chatgpt-mermaid-\_r_1df\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1df\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1df\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1df\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1df\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1df\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Open DaymarkInitial SetupCreate AdministratorAccountChoose Single or Multi-userModeConfigure Timezone andPreferencesCreate Default WorkspacesOffice / Personal / LearningDashboard

Default setup:

- Create Office workspace.
- Create Personal workspace.
- Optionally create Learning workspace.
- Configure default task types.
- Configure default phases.
- Configure timezone.
- Select theme.

Users can skip optional workspaces and create them later.

## Flow B: Daily task management

\#chatgpt-mermaid-\_r_1do\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1do\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1do\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1do\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1do\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1do\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1do\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1do\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1do\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1do\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1do\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1do\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1do\_ p{margin:0;}#chatgpt-mermaid-\_r_1do\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1do\_ .label text,#chatgpt-mermaid-\_r_1do\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ .node rect,#chatgpt-mermaid-\_r_1do\_ .node circle,#chatgpt-mermaid-\_r_1do\_ .node ellipse,#chatgpt-mermaid-\_r_1do\_ .node polygon,#chatgpt-mermaid-\_r_1do\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .rough-node .label text,#chatgpt-mermaid-\_r_1do\_ .node .label text,#chatgpt-mermaid-\_r_1do\_ .image-shape .label,#chatgpt-mermaid-\_r_1do\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1do\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .rough-node .label,#chatgpt-mermaid-\_r_1do\_ .node .label,#chatgpt-mermaid-\_r_1do\_ .image-shape .label,#chatgpt-mermaid-\_r_1do\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1do\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1do\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1do\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1do\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1do\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1do\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1do\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1do\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1do\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1do\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1do\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1do\_ .icon-shape,#chatgpt-mermaid-\_r_1do\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1do\_ .icon-shape p,#chatgpt-mermaid-\_r_1do\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1do\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1do\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1do\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1do\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1do\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1do\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1do\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1do\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1do\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1do\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1do\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1do\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1do\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1do\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1do\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1do\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .node rect,#chatgpt-mermaid-\_r_1do\_ .node circle,#chatgpt-mermaid-\_r_1do\_ .node ellipse,#chatgpt-mermaid-\_r_1do\_ .node polygon,#chatgpt-mermaid-\_r_1do\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1do\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1do\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1do\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1do\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1do\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Open My DayView Today's TasksReview CarryoversAdd or Select TaskStart TimerWork on TaskTask Finished?Pause or ContinueComplete TaskRecord HistoryUpdate Daily ProgressDaily ReviewNoYes

A task can be paused, blocked or carried forward without losing recorded effort.

## Flow C: Development task

Example: Implement a feature across multiple codebases.

\#chatgpt-mermaid-\_r_1e1\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1e1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1e1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1e1\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1e1\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1e1\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1e1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1e1\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1e1\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1e1\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1e1\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1e1\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1e1\_ p{margin:0;}#chatgpt-mermaid-\_r_1e1\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1e1\_ .label text,#chatgpt-mermaid-\_r_1e1\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ .node rect,#chatgpt-mermaid-\_r_1e1\_ .node circle,#chatgpt-mermaid-\_r_1e1\_ .node ellipse,#chatgpt-mermaid-\_r_1e1\_ .node polygon,#chatgpt-mermaid-\_r_1e1\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .rough-node .label text,#chatgpt-mermaid-\_r_1e1\_ .node .label text,#chatgpt-mermaid-\_r_1e1\_ .image-shape .label,#chatgpt-mermaid-\_r_1e1\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1e1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .rough-node .label,#chatgpt-mermaid-\_r_1e1\_ .node .label,#chatgpt-mermaid-\_r_1e1\_ .image-shape .label,#chatgpt-mermaid-\_r_1e1\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1e1\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1e1\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1e1\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1e1\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1e1\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1e1\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1e1\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1e1\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1e1\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1e1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1e1\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1e1\_ .icon-shape,#chatgpt-mermaid-\_r_1e1\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1e1\_ .icon-shape p,#chatgpt-mermaid-\_r_1e1\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1e1\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1e1\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1e1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1e1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1e1\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1e1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1e1\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1e1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1e1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1e1\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1e1\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1e1\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1e1\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1e1\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1e1\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1e1\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .node rect,#chatgpt-mermaid-\_r_1e1\_ .node circle,#chatgpt-mermaid-\_r_1e1\_ .node ellipse,#chatgpt-mermaid-\_r_1e1\_ .node polygon,#chatgpt-mermaid-\_r_1e1\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1e1\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1e1\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1e1\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1e1\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1e1\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Create Development TaskSelect Office WorkspaceSelect ProjectAdd Jira ReferenceAttach RepositoriesAdd BranchesStart DevelopmentRecord Time and PhaseChangesCreate PR / Merge RecordRecord UAT DeploymentRecord ProductionDeploymentProduction VerificationUpdate Delivery Analytics

The Jira ticket is simply a reference. No Jira API integration is required.

## Flow D: Weekly planning and review

\#chatgpt-mermaid-\_r_1ea\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_1ea\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1ea\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_1ea\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_1ea\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_1ea\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_1ea\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_1ea\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_1ea\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_1ea\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ea\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ea\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_1ea\_ p{margin:0;}#chatgpt-mermaid-\_r_1ea\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_1ea\_ .label text,#chatgpt-mermaid-\_r_1ea\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ .node rect,#chatgpt-mermaid-\_r_1ea\_ .node circle,#chatgpt-mermaid-\_r_1ea\_ .node ellipse,#chatgpt-mermaid-\_r_1ea\_ .node polygon,#chatgpt-mermaid-\_r_1ea\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .rough-node .label text,#chatgpt-mermaid-\_r_1ea\_ .node .label text,#chatgpt-mermaid-\_r_1ea\_ .image-shape .label,#chatgpt-mermaid-\_r_1ea\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_1ea\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .rough-node .label,#chatgpt-mermaid-\_r_1ea\_ .node .label,#chatgpt-mermaid-\_r_1ea\_ .image-shape .label,#chatgpt-mermaid-\_r_1ea\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_1ea\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_1ea\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ea\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ea\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_1ea\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1ea\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1ea\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1ea\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_1ea\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_1ea\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_1ea\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_1ea\_ .icon-shape,#chatgpt-mermaid-\_r_1ea\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_1ea\_ .icon-shape p,#chatgpt-mermaid-\_r_1ea\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_1ea\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_1ea\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_1ea\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_1ea\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_1ea\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_1ea\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_1ea\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_1ea\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_1ea\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ea\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_1ea\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_1ea\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1ea\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_1ea\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_1ea\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_1ea\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .node rect,#chatgpt-mermaid-\_r_1ea\_ .node circle,#chatgpt-mermaid-\_r_1ea\_ .node ellipse,#chatgpt-mermaid-\_r_1ea\_ .node polygon,#chatgpt-mermaid-\_r_1ea\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_1ea\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_1ea\_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_1ea\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_1ea\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_1ea\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Open Weekly PlannerSet Weekly GoalsSchedule TasksWork During WeekTrack Time and ProgressReview CompletionIdentify CarryoversGenerate Weekly SummaryPlan Next Week

## Flow E: Historical investigation

A user should be able to open the activity timeline, choose a historical date range and reconstruct what happened.

For example:

- Find everything worked on last month.
- Filter to Office.
- Filter to Provider Dashboard.
- Filter to a specific repository.
- Find a Jira ticket.
- See all status transitions.
- See actual work sessions.
- See delivery records.

This is one of the defining use cases of Daymark.

# 7. Productivity calculation specification

We need consistent definitions before building analytics. Otherwise, the same dashboard metric might produce different numbers in different screens.

## 7.1 Completion rate

\\[ Completion = \frac{Completed\ Planned\ Tasks} {Original\ Planned\ Tasks} \times 100 \\]

Tasks added after the planning period starts should be reported separately.

Cancelled tasks should be excluded from the completion denominator, with the original and adjusted figures available for transparency.

## 7.2 Time investment

\\[ Total\ Effort = \sum Timer\ Sessions + \sum Manual\ Entries \\]

Exclude cancelled sessions and avoid counting any overlapping intervals.

## 7.3 Estimation accuracy

\\[ Estimation\ Ratio = \frac{Actual\ Duration}{Estimated\ Duration} \\]

Show this as a ratio rather than a score.

- 1.0 = estimate matched actual time.
- Above 1.0 = took longer than estimated.
- Below 1.0 = took less time than estimated.

Only include tasks with both values.

## 7.4 Production delivery rate

\\[ Delivery\ Rate = \frac{Completed\ Tasks\ with\ Production\ Delivery} {Eligible\ Completed\ Development\ Tasks} \times 100 \\]

Report production verification separately from deployment.

A deployment record alone does not necessarily mean the feature was verified successfully.

## 7.5 Carryover rate

\\[ Carryover\ Rate = \frac{Unfinished\ Original\ Planned\ Tasks} {Original\ Planned\ Tasks} \times 100 \\]

Cancelled and explicitly removed tasks should be shown separately.

## 7.6 Cycle time

Calculate:

- Start: first transition into an active status.
- End: first transition into a terminal completed status.
- Exclusions: periods spent in paused or blocked states, if the metric is explicitly named active cycle time.

Display both:

- Calendar cycle time.
- Active cycle time.

This avoids hiding delays.

## 7.7 Productivity dashboard dimensions

Do not combine these into one unexplained productivity score.

Execution

Completion and carryover.

Effort

Time invested and distribution.

Delivery

Merged, deployed and verified work.

Planning

Estimation and workload accuracy.

All analytics should support date range and workspace filtering.

# 8. UI/UX requirements

## 8.1 Design direction

The design should feel like a premium productivity product, not an administrative dashboard.

My recommendation:

- Dark mode as the initial default.
- Complete light mode.
- Neutral backgrounds.
- Restrained accent colors.
- Subtle borders.
- Compact data visualizations.
- Excellent typography.
- Clear visual hierarchy.
- Consistent spacing.
- Responsive layout.

## 8.2 Main navigation

## Daymark

WORKSPACE

All Workspaces

Office

Personal

Learning

MANAGE

Overview

My Day

Planner

Tasks

Projects

Development

Time Tracking

Activity

Journal

Analytics

Settings

## 8.3 Important interaction requirements

- Quick task creation should be accessible from anywhere.
- Global search should be keyboard accessible.
- Task details should open in a side panel or dedicated page.
- Timer controls should remain accessible while navigating.
- Status and phase changes should be quick.
- Forms should support keyboard navigation.
- Empty states should provide useful next actions.
- Loading and error states should be consistent.
- Charts must have accessible textual alternatives.
- Mobile users should be able to create tasks, track time and update statuses.

## 8.4 Dashboard customization

MVP:

- Show/hide widgets.
- Choose workspace scope.
- Choose date ranges.
- Save default workspace filter.

Later:

- Drag-and-drop widget arrangement.
- Custom dashboard layouts.
- Multiple saved dashboards.

# 9. Deployment and open-source architecture

## 9.1 Deployment strategy

The application should be deployable in two ways without maintaining two separate codebases.

Self-hosted deployment

First-class support

User's machine / server

Daymark Web Container

Next.js application

PostgreSQL Container

Persistent database volume

Backup Location

Local backup files

A reverse proxy with HTTPS can be configured for remote access.

Hosted deployment

Future-compatible

Hosted Next.js application

Managed PostgreSQL

Automated backups and monitoring

## 9.2 Docker Compose

Initial deployment should be straightforward.

```
git clone https://github.com/your-org/daymark.git

cd daymark

cp .env.example .env

docker compose up -d
```

Suggested Compose services:

- `web`
- `db`

Use a persistent database volume and health checks.

Do not expose PostgreSQL publicly by default.

## 9.3 Environment configuration

Example:

```
NODE_ENV=production

APP_URL=http://localhost:3000

DATABASE_URL=postgresql://daymark:password@db:5432/daymark

AUTH_SECRET=replace-with-a-secure-secret

REGISTRATION_MODE=disabled

DEPLOYMENT_MODE=self-hosted

DEFAULT_TIMEZONE=Asia/Kolkata
```

This is illustrative. Production secrets must be generated securely, and the example password must never be reused.

## 9.4 Backup and restore

MVP must support:

- Database backup.
- Database restore.
- JSON export.
- CSV export.
- Import validation.
- Backup documentation.

Recommended backup format:

- PostgreSQL-native backup for full restoration.
- JSON archive for application-level portability.
- CSV for human-readable reporting.

Import should validate schema version, ownership and relationships before writing data.

## 9.5 Open-source repository requirements

The repository should include:

| File               | Purpose                            |
| ------------------ | ---------------------------------- |
| README.md          | Product introduction               |
| LICENSE            | Open-source license                |
| CONTRIBUTING.md    | Contribution guidelines            |
| CODE_OF_CONDUCT.md | Community standards                |
| SECURITY.md        | Vulnerability reporting            |
| CHANGELOG.md       | Version history                    |
| .env.example       | Configuration                      |
| docker-compose.yml | Deployment                         |
| docs/              | Technical documentation            |
| .github/           | Issues, PR templates and workflows |

I recommend the MIT License for maximum adoption flexibility, provided that is the licensing model you want.

# 10. Non-functional requirements

These are product requirements, not optional polish.

| Area            | Requirement                                             |
| --------------- | ------------------------------------------------------- |
| Performance     | Common dashboard and task queries should feel immediate |
| Reliability     | No silent loss of task history or timer records         |
| Security        | Strict user-level data isolation                        |
| Scalability     | Support multiple independent users                      |
| Maintainability | Clear domain boundaries                                 |
| Accessibility   | Keyboard navigation and accessible controls             |
| Responsiveness  | Desktop-first, mobile-compatible                        |
| Portability     | Standard PostgreSQL database                            |
| Extensibility   | Configurable task types, phases and statuses            |
| Testing         | Unit, integration and E2E coverage                      |
| Privacy         | No mandatory third-party services                       |

### Testing requirements

Particularly important test cases:

1. A task cannot reference another user's project.
2. A user cannot access another user's task through a guessed UUID.
3. Status transitions always create history.
4. Phase transitions always create history.
5. Two simultaneous timer-start requests cannot create two active timers.
6. Paused duration is excluded from active effort.
7. Timer data survives browser refresh.
8. Manual entries do not overlap recorded sessions without reconciliation.
9. Task carryover preserves original planning information.
10. Delivery metrics do not count failed deployments as successful deliveries.
11. Archived tasks remain available in historical reporting.
12. Database backup and restoration preserve historical relationships.

# 11. MVP scope and release definition

We need to distinguish between the complete product vision and the first usable public release.

The MVP should be something you can use every day, not merely a collection of partially implemented screens.

## 11.1 MVP feature checklist

MVP implementation tracker

0/39 completed

1\. Foundation

0 of 5 completed

Next.js application setup

PostgreSQL and Drizzle configuration

Authentication and initial setup

Single-user and multi-user modes

Workspace creation and isolation

2\. Task management

0 of 6 completed

Projects and tasks

Custom task statuses

Implementation phases

Status and phase history

Subtasks and task dependencies

Search, filters and task archive

3\. Planning

0 of 5 completed

Daily planner

Weekly planner

Weekly goals

Carryover management

Daily review

4\. Time tracking

0 of 5 completed

Start, pause, resume and stop timer

Manual time entries

Session history

Time aggregation

Active timer persistence

5\. Developer tracking

0 of 6 completed

Repository management

Multiple repositories per task

Branch tracking

Jira and PR references

Delivery records

Production verification

6\. Insights

0 of 6 completed

Overview dashboard

Completion analytics

Workspace time distribution

Estimate versus actual

Production delivery analytics

Activity timeline

7\. Release readiness

0 of 6 completed

Responsive interface

Dark and light themes

Data export

Backup and restore

Docker Compose

Documentation and tests

Reset checklist

## 11.2 MVP acceptance criteria

The MVP is ready for release when:

- A user can create an account and configure workspaces.
- Office and Personal work can be managed independently.
- The combined dashboard displays both.
- A task can move through configurable statuses and phases.
- Every important transition has a historical record.
- A user can plan tasks daily and weekly.
- Time can be recorded through timers and manual entries.
- Development tasks can reference multiple repositories and branches.
- Jira and PR links can be attached.
- Deployment and production verification can be recorded.
- Basic productivity metrics are accurate.
- Activity history is searchable.
- Data can be backed up and exported.
- Another developer can install the application using Docker without relying on your accounts or external APIs.

# 12. Implementation roadmap

I recommend building this over approximately 8–10 weeks of focused development, allowing more time if you are balancing it with your current job.

The objective is to release something useful early and improve it incrementally.

## Development timeline

1. Week 1 — Foundation

   Milestone 1
   - Repository and project setup.
   - Database configuration.
   - Authentication.
   - Workspace model.
   - Application layout.
2. Weeks 2–3 — Core task engine

   Milestone 2
   - Projects and tasks.
   - Configurable statuses.
   - Phase management.
   - Status and phase history.
   - Activity event generation.
   - Task detail interface.
3. Week 4 — Daily and weekly planning

   Milestone 3
   - Daily planner.
   - Weekly planner.
   - Task scheduling.
   - Carryovers.
   - Daily reviews.
4. Week 5 — Time tracking

   Milestone 4
   - Timer engine.
   - Manual entries.
   - Session persistence.
   - Time reports.
5. Week 6 — Development tracking

   Milestone 5
   - Repository management.
   - Multiple codebases per task.
   - Branches and Jira references.
   - PR and delivery records.
   - Production verification.
6. Week 7 — Analytics and dashboard

   Milestone 6
   - Productivity calculations.
   - Dashboard widgets.
   - Workspace distribution.
   - Delivery reports.
   - Activity timeline.
7. Week 8 — Journal and polish

   Milestone 7
   - Journal.
   - Search.
   - Settings.
   - Responsive design.
   - Accessibility.
8. Weeks 9–10 — Open-source release

   Public release
   - Automated tests.
   - Docker deployment.
   - Backup and restore.
   - Documentation.
   - Demo data.
   - GitHub Actions.
   - First stable release.

These are estimates, not fixed deadlines. Database integrity and timer correctness should take priority over adding more UI features.

## 12.1 Development order

I would implement features in this dependency order:

```
Authentication
    ↓
User & Workspace
    ↓
Projects & Tasks
    ↓
Task Status / Phase History
    ↓
Activity Events
    ↓
Daily / Weekly Planning
    ↓
Time Tracking
    ↓
Development Tracking
    ↓
Delivery Records
    ↓
Analytics
    ↓
Journal / Reports
    ↓
Open-source Packaging
```

Do not build the analytics dashboard before the underlying event and time data is reliable.

# 13. Post-MVP roadmap

These are intentionally excluded from the first public release.

| Feature                  | Future value                           |
| ------------------------ | -------------------------------------- |
| Recurring tasks          | Repeated responsibilities and routines |
| Calendar integration     | Calendar-based planning                |
| GitHub integration       | Automatic PR and commit references     |
| Jira integration         | Ticket synchronization                 |
| PWA support              | Installable application                |
| Offline task capture     | Work without a connection              |
| AI daily summaries       | Summarize historical records           |
| AI weekly review         | Explain trends and accomplishments     |
| Custom dashboards        | Personalized analytics                 |
| Shared workspaces        | Team collaboration                     |
| Public project portfolio | Publish selected accomplishments       |
| Advanced habit tracking  | Personal routines and consistency      |
| Import from other tools  | Easier adoption                        |

A particularly interesting future feature would be a Personal Career History module.

It could generate a private report of:

- Projects worked on.
- Technologies used.
- Features delivered.
- Bugs resolved.
- Repositories contributed to.
- Production deployments.
- Technical challenges.
- Learning milestones.

This could eventually help users prepare resumes, performance reviews and interviews using their own recorded history.

However, it must be opt-in, private and based only on information users have entered. It should never automatically publish confidential office activity.

# 14. Open-source product strategy

## Repository identity

Suggested repository:

`github.com/your-username/daymark`

Suggested description:

> An open-source personal work and life intelligence dashboard. Track tasks, time, projects, development activity and productivity. Self-host it and own your data.

Suggested GitHub topics:

`productivity` `task-management` `time-tracking` `self-hosted` `open-source` `nextjs` `postgresql` `personal-dashboard`

## Contribution strategy

For the first public release:

- MIT License.
- GitHub Issues.
- Pull request templates.
- Bug report template.
- Feature request template.
- Contribution guide.
- Architecture documentation.
- Setup guide.
- Screenshots and demo data.
- Versioned releases.

I would also maintain an architecture decision record (`docs/adr/`) so future contributors understand why PostgreSQL, the modular monolith, workspace isolation and event history were chosen.

## Demo experience

Provide a seeded demonstration environment with fake data.

Example:

- Office workspace.
- Personal workspace.
- Sample development project.
- Sample tasks across multiple statuses.
- Sample repositories.
- Fake Jira references.
- Historical time sessions.
- Production delivery records.
- Sample analytics.

Never use real employer or patient data in the public demo.

# 15. Final architecture decisions

This is the baseline we should follow unless a concrete technical requirement forces a change.

| Decision              | Final choice                            |
| --------------------- | --------------------------------------- |
| Product               | Daymark                                 |
| Product type          | Personal work and life intelligence     |
| Organization          | Hybrid workspace model                  |
| User model            | Single-user and multi-user              |
| Workspace ownership   | Private to individual user              |
| Deployment            | Self-hosted first, cloud-ready          |
| Frontend              | Next.js + React + TypeScript            |
| Backend               | Next.js modular monolith                |
| Database              | PostgreSQL                              |
| ORM                   | Drizzle                                 |
| Authentication        | Better Auth                             |
| Validation            | Zod                                     |
| UI                    | Tailwind + shadcn/ui                    |
| Analytics             | Recharts + SQL aggregations             |
| Testing               | Vitest + Playwright                     |
| Deployment            | Docker Compose                          |
| External integrations | None required for MVP                   |
| AI                    | Not required for MVP                    |
| Historical tracking   | Append-only events and history          |
| Licensing             | MIT, proposed                           |
| Primary audience      | Individual professionals and developers |

## 15.1 Five architectural rules we should never compromise

1. Workspace isolation: Office and Personal must remain separate at the data level while supporting unified reporting.
2. Historical preservation: Changing a task's status, phase, branch or delivery information must not erase its history.
3. Time accuracy: Timer data must be persisted and calculated server-side. Browser refreshes must not destroy work sessions.
4. Delivery accuracy: Completing a task, merging code, deploying to production and verifying production are separate events.
5. User ownership: No user's records should ever be accessible to another user, regardless of whether the application is self-hosted or cloud-hosted.

# 16. What I would build first

My recommendation is to start with the foundation and the task lifecycle, not the analytics screen.

The first working milestone should allow you to:

1. Log in.
2. Create Office and Personal workspaces.
3. Create projects.
4. Create tasks.
5. Change task statuses and phases.
6. See the complete task history.
7. Schedule tasks for today and this week.
8. Record basic time.

Once this works reliably, add repository tracking, production delivery and analytics.

That gives you a useful application even before the full feature set is complete.

One final product consideration: Since this will eventually be open source, keep the core domain independent of the hosting provider. The same application should work on a developer's laptop, a VPS, or a hosted environment without requiring changes to the business logic.

## 17. Immediate next step: establish the project foundation

I suggest treating the following as the first implementation milestone:

Milestone 1

Start here

# Daymark Foundation

Deliverables

- Finalize repository structure.
- Initialize Next.js and TypeScript.
- Configure Tailwind and shadcn/ui.
- Configure PostgreSQL and Drizzle.
- Implement authentication.
- Implement user and workspace schemas.
- Build initial dashboard shell.
- Implement Docker Compose.
- Add seed data and initial tests.&#x20;

  Definition of done

A developer can clone Daymark, run Docker Compose, create an account, configure Office and Personal workspaces, and access a working dashboard.

My recommendation is to maintain three permanent project documents from day one:

- `docs/PRODUCT_SPEC.md` — this product specification.
- `docs/ARCHITECTURE.md` — system architecture and boundaries.
- `docs/DEVELOPMENT_PLAN.md` — implementation milestones and progress.

These will also become useful context for Codex and Cursor when working across the project.

The goal isn't just to finish another portfolio project. It's to build a product you genuinely use every day, and that other developers find valuable enough to install, contribute to and recommend.

&#x20;Create the Daymark dashboard design