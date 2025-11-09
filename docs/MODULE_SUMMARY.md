# Module Summary

Generated: 2025-11-09T08:03:21.008Z

Each section summarizes responsibilities, key artifacts, and guardrails for extending the module.

## Backend Modules

### Auth

**Path**: `backend/src/modules/auth`

**What it does**
- Single-admin authentication using env-managed credentials and JWT issuance.
- Exposes /auth/login for token minting and /auth/me for session introspection.

**Key files**
- `backend/src/modules/auth/auth.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/auth/auth.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/auth/auth.service.ts` — Business logic service consumed by controllers.
- `backend/src/modules/auth/dto/login.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `AuthController`
- `AuthModule`
- `AuthService`
- `LoginDto`
- `JwtStrategy`

**Invariants & contracts**
- Only the admin credentials defined via env/ConfigService are accepted; no multi-user state.
- Prisma upsert guarantees the backing User row exists for audit/logging.

**Failure modes**
- Invalid credentials raise UnauthorizedException, surfacing as HTTP 401.
- Missing JWT secret or expires-in configuration will produce unsigned/short-lived tokens.

**How to extend / pitfalls**
- Add new login flows by expanding AuthService and wiring additional DTO validation.
- Keep JwtStrategy/guards aligned with any changes to the session payload.

### Companies

**Path**: `backend/src/modules/companies`

**What it does**
- Maintains the catalog of companies tied to jobs and contacts.
- Provides search, create, update, and detail routes under /companies.

**Key files**
- `backend/src/modules/companies/companies.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/companies/companies.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/companies/companies.service.ts` — Business logic service consumed by controllers.
- `backend/src/modules/companies/dto/create-company.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/companies/dto/update-company.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `CompaniesController`
- `CompaniesModule`
- `CompaniesService`
- `CreateCompanyDto`
- `UpdateCompanyDto`

**Invariants & contracts**
- Names are deduplicated case-insensitively before insert to avoid duplicates.
- Each update ensures the company exists first to avoid silent creates.

**Failure modes**
- Unknown company IDs surface as NotFoundException.
- High-volume queries rely on DB indexes; missing indexes will regress list performance.

**How to extend / pitfalls**
- Add new metadata fields by extending the Prisma model and DTOs together.
- When exposing derived stats, prefer Prisma projections over computed loops.

### Contacts

**Path**: `backend/src/modules/contacts`

**What it does**
- Manages networking contacts, their strength, and linkage to jobs/outreach.
- Supports rich filters (tags, last touch, company) and linking to companies.

**Key files**
- `backend/src/modules/contacts/contacts.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/contacts/contacts.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/contacts/contacts.service.ts` — Business logic service consumed by controllers.
- `backend/src/modules/contacts/dto/create-contact-outreach.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/contacts/dto/create-contact.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `ContactsController`
- `ContactsModule`
- `ContactsService`
- `CreateContactOutreachDto`
- `CreateContactDto`
- `CreateReferralDto`
- `CreateReviewDto`
- `ListContactsQueryDto`
- `UpdateContactDto`

**Invariants & contracts**
- Contacts default to non-archived view; includeArchived must be explicitly requested.
- Engagement scores derive from outreach/followup joins and require recent activity data.

**Failure modes**
- Missing company references trigger NotFoundException before writes.
- Large text searches may need additional DB indexes if new fields are added.

**How to extend / pitfalls**
- Add new filters by updating the list query builder + DTO schema.
- Keep computed engagement helpers in sync when adding new touch types.

### Jobs

**Path**: `backend/src/modules/jobs`

**What it does**
- Owns the job pipeline: listing, creation, heat scoring, and stage tracking.
- Coordinates with Contacts/Followups/Outreach to surface linked activity.

**Key files**
- `backend/src/modules/jobs/dto/add-application.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/jobs/dto/create-job-outreach.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/jobs/dto/create-job.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/jobs/dto/list-jobs-query.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/jobs/dto/update-job-stage.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `AddApplicationDto`
- `CreateJobOutreachDto`
- `CreateJobOutreachInput`
- `createJobOutreachSchema`
- `CreateJobDto`
- `ListJobsQueryDto`
- `UpdateJobDto`
- `UpdateJobStageDto`
- `HeatRules`
- `loadHeatRules`

**Invariants & contracts**
- Every create/update records stage history and recalculates heat rules.
- Heat computation depends on shared rules loaded via heat-rules.loader.

**Failure modes**
- Conflicting applications/outreach updates raise ConflictException.
- Missing job IDs bubble up as NotFoundException; archived jobs are skipped by default.

**How to extend / pitfalls**
- Add new pipeline stages only after updating the Prisma enum, heat rules, and DTOs.
- Wrap multi-step mutations inside Prisma transactions to keep counts consistent.

### Outreach

**Path**: `backend/src/modules/outreach`

**What it does**
- Tracks outreach interactions by channel, personalization, and outcomes.
- Provides endpoints to log touches, mark responses, and find stale outreach needing action.

**Key files**
- `backend/src/modules/outreach/dto/create-outreach.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/outreach/dto/update-outreach.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/outreach/outreach.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/outreach/outreach.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/outreach/outreach.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `CreateOutreachDto`
- `CreateOutreachInput`
- `ListOutreachQueryDto`
- `UpdateOutreachDto`
- `UpdateOutreachInput`
- `OutreachController`
- `OutreachModule`
- `OutreachService`

**Invariants & contracts**
- Channel and outcome enums must match the Prisma schema and frontend selects.
- Stale lookups rely on sentAt timestamps; ensure timezone handling uses dayjs helpers.

**Failure modes**
- Missing contact/job references raise NotFoundException before writes.
- High personalization scores without matching enums will fail DTO validation.

**How to extend / pitfalls**
- Add new channels/outcomes by updating Prisma enums, DTO zod schemas, and frontend constants.
- Keep OutreachService.findStaleWithoutOutcome aligned with dashboard expectations.

### Followups

**Path**: `backend/src/modules/followups`

**What it does**
- Schedules and completes follow-up reminders tied to jobs or contacts.
- Feeds the dashboard action queue with due/overdue tasks.

**Key files**
- `backend/src/modules/followups/dto/send-followup.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/followups/followups.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/followups/followups.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/followups/followups.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `FollowupQueryDto`
- `SendFollowupDto`
- `FollowupsController`
- `FollowupsModule`
- `FollowupsService`

**Invariants & contracts**
- Each follow-up stores attempt numbers to keep outreach cadence predictable.
- Due date filters always return non-archived contacts/jobs.

**Failure modes**
- Marking a follow-up complete without a matching record throws NotFoundException.
- Timezone mistakes will shift dueAt comparisons; rely on shared dayjs config.

**How to extend / pitfalls**
- Add new due buckets by updating FollowupsService getters and DTO enums.
- Any auto-generation logic should reuse TasksService to avoid duplicate reminders.

### Dashboard

**Path**: `backend/src/modules/dashboard`

**What it does**
- Aggregates KPI, task, outreach, and stats data into the mission-control summary.
- Caches per-user summaries with feature-flag control for Dashboard V1.

**Key files**
- `backend/src/modules/dashboard/dashboard.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/dashboard/dashboard.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/dashboard/dashboard.service.ts` — Business logic service consumed by controllers.
- `backend/src/modules/dashboard/dto/dashboard-summary.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `DashboardController`
- `DashboardModule`
- `DashboardService`
- `DashboardActionSuggestion`
- `DashboardJobReference`
- `DashboardNextBestAction`
- `DashboardNotification`
- `DashboardNotificationSeverity`
- `DashboardQueueItem`
- `DashboardQueueItemType`

**Invariants & contracts**
- Accepted range values are limited to 7/14/30 days and sanitized server-side.
- Cache entries expire according to app.dashboard.cacheTtlSeconds.

**Failure modes**
- Downstream service timeouts flip the degraded flag but still deliver partial data.
- Dashboard feature flag false => controller returns 404 to hide the module.

**How to extend / pitfalls**
- Use callWithTimeout helper when adding new dependencies to keep degraded semantics consistent.
- Remember to update DTOs when adding new queue/notification payloads.

### KPI

**Path**: `backend/src/modules/kpi`

**What it does**
- Calculates day/week KPIs such as CVs sent, outreach, follow-ups, and reviews.
- Serves chart-ready datasets consumed by the dashboard and legacy widgets.

**Key files**
- `backend/src/modules/kpi/kpi.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/kpi/kpi.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/kpi/kpi.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `KpiController`
- `KpiModule`
- `KpiService`

**Invariants & contracts**
- KPI ranges default to the user timezone; keep TIMEZONE env in sync.
- Metrics rely on Prisma aggregations; ensure indexes exist when adding new ones.

**Failure modes**
- Invalid date ranges raise BadRequestException via DTO validation.
- Large time windows may cause slow Prisma scans without additional constraints.

**How to extend / pitfalls**
- Add new KPI fields by extending dto outputs plus StatsService/TasksService feeders.
- Expose grouped metrics via dedicated DTOs rather than overloading existing endpoints.

### Stats

**Path**: `backend/src/modules/stats`

**What it does**
- Produces weekly series for CVs, outreach, follow-ups, and heat buckets.
- Backs the dashboard charts and legacy timeline components.

**Key files**
- `backend/src/modules/stats/dto/stats-weekly.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/stats/stats.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/stats/stats.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/stats/stats.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `StatsSeriesPoint`
- `StatsWeeklySummaryDto`
- `StatsController`
- `StatsModule`
- `StatsService`

**Invariants & contracts**
- All queries are time-zone aware and normalized via shared dayjs instance.
- Weekly summaries clamp to allowed windows (7/14/30).

**Failure modes**
- Missing data returns zeroed StatsWeeklySummaryDto but still sets degraded flags.
- Misconfigured timezone will skew bucket boundaries and degrade insights.

**How to extend / pitfalls**
- Use addSeries helper when layering new metrics so the frontend receives consistent shapes.
- Update tests/fixtures when introducing new data points.

### Tasks

**Path**: `backend/src/modules/tasks`

**What it does**
- Crud + automation endpoints for personal tasks and follow-up automation.
- Includes helper utilities (parser/snooze/kpis) that power dashboard suggestions.

**Key files**
- `backend/src/modules/tasks/automation.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/tasks/dto/bulk-create-tasks.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/tasks/dto/create-task.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/tasks/dto/outreach-automation.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/tasks/dto/quick-parse.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `AutomationController`
- `BulkCreateTasksDto`
- `BulkCreateTasksInput`
- `bulkCreateTasksSchema`
- `CreateTaskDto`
- `CreateTaskInput`
- `createTaskSchema`
- `ListTasksQuery`
- `ListTasksQueryDto`
- `listTasksSchema`

**Invariants & contracts**
- Automation endpoints require idempotent task IDs so scheduler retries stay safe.
- Actionable-task queries always normalize timezone from TIMEZONE env.

**Failure modes**
- Missing tasks raise NotFoundException in service methods.
- Parsing cron-like recurrence strings without validation can break scheduling.

**How to extend / pitfalls**
- Add new automation flows under tasks/automation.controller + service pair.
- Reuse task-parser utilities when introducing new recurrence types.

### Notifications

**Path**: `backend/src/modules/notifications`

**What it does**
- Stores lightweight reminders (dueAt/sentAt) derived from tasks/outreach.
- Serves digest/list endpoints for dashboard cards.

**Key files**
- `backend/src/modules/notifications/notifications.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/notifications/notifications.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/notifications/notifications.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `ListNotificationsQueryDto`
- `NotificationsController`
- `NotificationsModule`
- `NotificationsScheduler`
- `NotificationsService`

**Invariants & contracts**
- Notification kinds map directly to frontend badges; update enums in tandem.
- Due queries default to today; clients must request other windows explicitly.

**Failure modes**
- Sending without a job/contact association may fail DTO validation.
- Deleting already sent notifications returns NotFoundException.

**How to extend / pitfalls**
- Add categorization by expanding Notification entity + DTO + React hooks.
- Prefer TTL indexes if volume grows (currently Prisma-managed).

### Projects & Reviews

**Path**: `backend/src/modules/projects`

**What it does**
- Tracks personal projects plus incoming/outgoing code reviews.
- Feeds growth/Grow module with spotlight-ready items.

**Key files**
- `backend/src/modules/projects/dto/create-project.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/projects/dto/update-project.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/projects/projects.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/projects/projects.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/projects/projects.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `CreateProjectDto`
- `UpdateProjectDto`
- `ProjectsController`
- `ProjectsModule`
- `ProjectsService`

**Invariants & contracts**
- Project highlights set spotlight flags that the frontend relies on for layout.
- Review completion toggles reviewedAt and must stay consistent with Growth metrics.

**Failure modes**
- Deleting linked projects without cascading reviews leads to referential integrity errors.
- Missing reviewer/contact relations raise NotFoundException.

**How to extend / pitfalls**
- Add new project metadata by updating Prisma + DTOs, then regenerate context.
- When integrating third-party repos, sanitize repoUrl before storing.

### Grow

**Path**: `backend/src/modules/grow`

**What it does**
- Combines GrowthReview, GrowthEvent, and GrowthBoostTask data for skills ramp.
- Exposes summary endpoints under /grow for the dedicated page.

**Key files**
- `backend/src/modules/grow/dto/create-growth-boost-task.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/grow/dto/create-growth-event.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/grow/dto/create-growth-review.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/grow/dto/create-project-highlight.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/grow/dto/update-growth-boost-task.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `BoostActivityStats`
- `BoostSuggestion`
- `suggestBoostTasks`
- `CreateGrowthBoostTaskDto`
- `boostTaskCategorySchema`
- `boostTaskStatusSchema`
- `CreateGrowthEventDto`
- `CreateGrowthReviewDto`
- `CreateProjectHighlightDto`
- `UpdateGrowthBoostTaskDto`

**Invariants & contracts**
- Growth boost tasks categorized by impactLevel; keep values within 1-5 scale.
- Reviews must link to contacts for contextual follow-ups.

**Failure modes**
- Attempting to complete nonexistent growth tasks raises NotFoundException.
- Leaving reviewer/contact IDs blank violates Prisma schema.

**How to extend / pitfalls**
- Consider using transactions when updating review plus growth stats simultaneously.
- Add new categories/tags via Prisma enums + React filters.

### Boosts

**Path**: `backend/src/modules/boosts`

**What it does**
- Lightweight backlog of “boost” tasks scored by impact to unblock the search.
- Routes cover list/create/complete/reopen/delete under /boosts.

**Key files**
- `backend/src/modules/boosts/boosts.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/boosts/boosts.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/boosts/boosts.service.ts` — Business logic service consumed by controllers.
- `backend/src/modules/boosts/dto/create-boost-task.dto.ts` — DTO or schema definition for request/response validation.

**Important types/functions**
- `BoostsController`
- `BoostsModule`
- `BoostsService`
- `CreateBoostTaskDto`

**Invariants & contracts**
- Impact scores are simple integers; keep DTO validation tight to avoid noisy data.
- Completing a boost stamps doneAt via shared dayjs helper.

**Failure modes**
- Completing missing IDs raises NotFoundException.
- Reopen/delete operations rely on optimistic updates; double-submit will error.

**How to extend / pitfalls**
- Add prioritization fields by extending Prisma + React data grids.
- Batch-complete flows should wrap operations in Prisma transactions.

### Events

**Path**: `backend/src/modules/events`

**What it does**
- Manages networking events plus contact links (EventContact).
- Feeds follow-up scheduling after events through eventContacts.

**Key files**
- `backend/src/modules/events/dto/add-event-contact.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/events/dto/attend-event.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/events/dto/create-event.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/events/dto/update-event.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/events/events.controller.ts` — NestJS controller exposing HTTP routes.

**Important types/functions**
- `AddEventContactDto`
- `AttendEventDto`
- `CreateEventDto`
- `UpdateEventDto`
- `EventsController`
- `EventsModule`
- `EventsService`

**Invariants & contracts**
- Event status limited to PLANNED/ATTENDED; update enums everywhere before adding more.
- Follow-up due dates stay optional; null values signal no obligation.

**Failure modes**
- Removing events cascades to EventContact; ensure Prisma relations stay consistent.
- Invalid dates or negative conversation targets fail DTO validation.

**How to extend / pitfalls**
- Add location/timezone data carefully—frontend expects ISO strings.
- Bulk import should dedupe contacts via ContactsService.

### Referrals

**Path**: `backend/src/modules/referrals`

**What it does**
- Logs referral/intro attempts tied to contacts and jobs.
- Supports listing, creation, and status reporting for referral analytics.

**Key files**
- `backend/src/modules/referrals/dto/create-referral.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/referrals/referrals.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/referrals/referrals.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/referrals/referrals.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `CreateReferralBodyDto`
- `ReferralsController`
- `ReferralsModule`
- `ReferralsService`

**Invariants & contracts**
- ReferralKind enum drives both backend validation and React display.
- Timestamps default to now; clients rarely send explicit values.

**Failure modes**
- Invalid job/contact IDs raise NotFoundException.
- Missing referral kind/notes fail Zod validation.

**How to extend / pitfalls**
- Use Prisma include to pull related job/contact details when adding new endpoints.
- Add referral scoring inside service, not the controller.

### Recommendations

**Path**: `backend/src/modules/recommendation`

**What it does**
- Stores automated recommendation payloads (kind + JSON) for the dashboard assistant.
- Routes include create/list/resolve for Next Best Action features.

**Key files**
- `backend/src/modules/recommendation/recommendation.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/recommendation/recommendation.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/recommendation/recommendation.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `RecommendationController`
- `RecommendationModule`
- `RecommendationResult`
- `RecommendationService`

**Invariants & contracts**
- Payload stays as Json column; keep schemas documented in dto definitions.
- Resolved recommendations carry resolvedAt timestamps for auditing.

**Failure modes**
- Resolving already-resolved items is idempotent but still queries the DB.
- Large payloads (>1MB) will exceed Postgres limits; avoid dumping huge context.

**How to extend / pitfalls**
- When adding new recommendation kinds, update DTO union + frontend cards.
- Prefer storing normalized references (jobId/contactId) inside payload for joins.

### Code Reviews

**Path**: `backend/src/modules/reviews`

**What it does**
- Captures code review activity tied to projects/contacts for growth tracking.
- Enables creation/list/update of CodeReview entries.

**Key files**
- `backend/src/modules/reviews/dto/create-review.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/modules/reviews/reviews.controller.ts` — NestJS controller exposing HTTP routes.
- `backend/src/modules/reviews/reviews.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/modules/reviews/reviews.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `CreateReviewBodyDto`
- `ReviewsController`
- `ReviewsModule`
- `ReviewsService`

**Invariants & contracts**
- Requests must reference both projectId and contactId; Zod enforces presence.
- Quality scores stored as ints; stay within agreed 1–5 scale.

**Failure modes**
- Deleting referenced projects triggers referential errors; cascade carefully.
- Incomplete DTO payloads fail validation with descriptive messages.

**How to extend / pitfalls**
- Extend GrowthReview reporting to include review stats if needed.
- Add filtering/sorting options by enhancing controller query DTO.

## Frontend Surface

### Shell & Routing

**Path**: `frontend/src`

**What it does**
- React Router shell (App.tsx + ShellLayout) gating auth and wiring top-level routes.

**Key files**
- `frontend/src/api/ApiProvider.tsx` — API client or hook implementation.
- `frontend/src/api/client.ts` — API client or hook implementation.
- `frontend/src/api/dashboard.ts` — API client or hook implementation.
- `frontend/src/api/hooks.ts` — API client or hook implementation.
- `frontend/src/api/useDashboard.ts` — API client or hook implementation.

**Important types/functions**
- `ApiProvider`
- `useApi`
- `API_BASE_URL`
- `createApiClient`
- `DashboardActionSuggestion`
- `DashboardNotificationSeverity`
- `DashboardQueueItemType`
- `DashboardSummary`
- `DashboardSummaryMeta`
- `DashboardSummaryResult`

**Invariants & contracts**
- Auth gating depends on Zustand session store; always update store before navigating.
- ShellLayout assumes routes provide Outlet-friendly children.

**Failure modes**
- Missing token redirects to /login immediately.
- Adding new routes without ShellLayout updates may leave nav links stale.

**How to extend / pitfalls**
- Add new pages by registering routes + nav items together.
- Keep lazy imports chunked if route bundles grow.

### Dashboard Page

**Path**: `frontend/src/pages/DashboardPage.tsx`

**What it does**
- Mission-control layout combining charts, KPI tiles, action center, and follow-up lists.
- Supports Legacy view fallback gated by VITE_DASHBOARD_V1.

**Key files**
- `frontend/src/pages/DashboardPage.tsx` — Page-level React component tied to routing.

**Important types/functions**
- `DashboardPage`

**Invariants & contracts**
- Range selector limited to 7/14/30; matches backend dashboard guard.
- Summary + stats hooks refetch in sync to keep degrade banner accurate.

**Failure modes**
- If summary hook errors, page renders “Dashboard unavailable” block instead of crashing.
- Missing meta data toggles degrade indicator incorrectly.

**How to extend / pitfalls**
- Add new widgets by placing them inside the CSS grid and wiring new hooks/chunks.
- Legacy view should stay untouched unless V1 flag removed.

### Jobs Page

**Path**: `frontend/src/pages/JobsPage.tsx`

**What it does**
- Jobs table + filters view for managing pipeline heat/stage.
- Integrates with dashboard deep links via query params.

**Key files**
- `frontend/src/pages/JobsPage.tsx` — Page-level React component tied to routing.

**Important types/functions**
- `JobsPage`

**Invariants & contracts**
- Expects backend to supply heat/stage enumerations; keep enums aligned.
- Pagination/filter state stored in URL search params.

**Failure modes**
- Breaking API contract on job list will blank the table.
- Missing focus ID param will fallback to default selection.

**How to extend / pitfalls**
- Add columns via shared table components to keep virtualization consistent.
- Leverage useJobs hook for data rather than calling axios directly.

### Contacts Page

**Path**: `frontend/src/pages/ContactsPage.tsx`

**What it does**
- Contact directory with filters for strength, tags, last touch, and company.
- Shows linked jobs/outreach/follow-ups in side panels.

**Key files**
- `frontend/src/pages/ContactsPage.tsx` — Page-level React component tied to routing.

**Important types/functions**
- `ContactsPage`

**Invariants & contracts**
- Relies on ContactsService to include linkedJobs/follow-ups; keep DTO names stable.
- Archived toggle defaults to false.

**Failure modes**
- Missing follow-up data leads to undefined next follow-up rows.
- Large tag filters can degrade performance; debounce inputs.

**How to extend / pitfalls**
- Add CSV export by reusing manifest metadata from backend list endpoint.
- Break UI into smaller components before adding more filters.

### Tasks Page

**Path**: `frontend/src/pages/TasksPage.tsx`

**What it does**
- Task management board plus automation toggles.
- Surfaces actionable tasks that align with dashboard queue.

**Key files**
- `frontend/src/pages/TasksPage.tsx` — Page-level React component tied to routing.

**Important types/functions**
- `TasksPage`

**Invariants & contracts**
- Task filters mirror backend statuses (Todo/Doing/Done).
- Automation toggles expect backend automation endpoints to exist.

**Failure modes**
- Missing statuses break column rendering.
- Optimistic updates must match backend payload shape.

**How to extend / pitfalls**
- Add board columns by updating both constants and CSS grid.
- Prefer React Query mutations for concurrency safety.

### Grow Page

**Path**: `frontend/src/pages/GrowPage.tsx`

**What it does**
- Growth-focused dashboard mixing reviews, boost tasks, and events.
- Enables planning upcoming outreach tied to learning goals.

**Key files**
- `frontend/src/pages/GrowPage.tsx` — Page-level React component tied to routing.

**Important types/functions**
- `GrowPage`

**Invariants & contracts**
- Assumes Growth API returns reviews/events/boost tasks arrays.
- Heatmap/timeline components expect ISO dates.

**Failure modes**
- If any dataset fails, page shows empty state but stays mounted.
- Mismatched enums (impactLevel/status) break badges.

**How to extend / pitfalls**
- Modularize sections before adding new growth metrics.
- Keep design tokens consistent with dashboard cards.

### API Layer

**Path**: `frontend/src/api`

**What it does**
- Axios client factory with auth interceptor plus React Query hooks for dashboard/stats.
- Centralizes API_BASE_URL + unauthorized handling.

**Key files**
- `frontend/src/api/ApiProvider.tsx` — API client or hook implementation.
- `frontend/src/api/client.ts` — API client or hook implementation.
- `frontend/src/api/dashboard.ts` — API client or hook implementation.
- `frontend/src/api/hooks.ts` — API client or hook implementation.
- `frontend/src/api/useDashboard.ts` — API client or hook implementation.

**Important types/functions**
- `ApiProvider`
- `useApi`
- `API_BASE_URL`
- `createApiClient`
- `DashboardActionSuggestion`
- `DashboardNotificationSeverity`
- `DashboardQueueItemType`
- `DashboardSummary`
- `DashboardSummaryMeta`
- `DashboardSummaryResult`

**Invariants & contracts**
- All hooks call createApiClient through ApiProvider to guarantee headers.
- Unauthorized responses trigger session clearing.

**Failure modes**
- Missing token leads to 401 loops unless onUnauthorized resets state.
- Environment variable VITE_API_URL must include protocol.

**How to extend / pitfalls**
- Define new typed hooks in frontend/src/api/hooks.ts to keep caching consistent.
- Share DTO types with backend via generated types if duplication grows.

### Dashboard Components

**Path**: `frontend/src/components/dashboard`

**What it does**
- Composable tiles/charts/widgets (KpiMiniTiles, NextBestActionCompact, Chart*).

**Key files**
- `frontend/src/components/dashboard/ActionBand.tsx` — React component used in the UI.
- `frontend/src/components/dashboard/ActionCenterTabs.tsx` — React component used in the UI.
- `frontend/src/components/dashboard/ChartCvsSent.tsx` — React component used in the UI.
- `frontend/src/components/dashboard/ChartFollowupsPie.tsx` — React component used in the UI.
- `frontend/src/components/dashboard/ChartWarmOutreach.tsx` — React component used in the UI.

**Important types/functions**
- `ActionBand`
- `ActionCenterTabs`
- `ChartCvsSent`
- `ChartFollowupsPie`
- `ChartWarmOutreach`
- `FollowupsStatusMini`
- `HeatBuckets`
- `HeatCompact`
- `InsightsMini`
- `KpiMiniTiles`

**Invariants & contracts**
- Each component is display-only; data fetching stays in DashboardPage.
- Charts rely on Recharts stub during tests; keep API stable.

**Failure modes**
- Missing props (loading/data) break skeleton states.
- High-frequency updates require memoization to avoid jank.

**How to extend / pitfalls**
- Add new widgets by following the same prop signatures (loading/degraded).
- Keep CSS grid measurements consistent for 12-column layout.

### Session Store

**Path**: `frontend/src/stores/session.ts`

**What it does**
- Zustand store persisting token + user profile to localStorage.
- Drives auth gating and API header injection.

**Key files**
- `frontend/src/stores/session.ts` — Source file.

**Important types/functions**
- `SessionUser`
- `useSessionStore`

**Invariants & contracts**
- Storage key job-hunt-session must stay stable to avoid forced logouts.
- clear() resets both token and user atomically.

**Failure modes**
- Persist middleware requires JSON-serializable state; do not add functions.
- Token mismatch vs HTTP-only cookie causes split-brain sessions.

**How to extend / pitfalls**
- Add metadata (e.g., roles) by expanding SessionUser type and store setters.
- Keep migrations in mind when evolving persisted structure.

## Infrastructure

### Prisma Layer

**Path**: `backend/src/prisma`

**What it does**
- PrismaService manages DB connections + env resolution; schema defines jobs/contacts/etc.
- Seed script populates mock data plus bootstrap admin credentials.

**Key files**
- `backend/src/prisma/prisma.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/prisma/prisma.service.ts` — Business logic service consumed by controllers.

**Important types/functions**
- `PrismaModule`
- `PrismaService`

**Invariants & contracts**
- DATABASE_URL is derived from NODE_ENV-specific envs when available.
- All relations use cuid IDs; cascading deletes require manual implementation.

**Failure modes**
- Missing DATABASE_URL_* envs cause runtime errors during Prisma bootstrap.
- Binary target mismatch requires regenerating Prisma client.

**How to extend / pitfalls**
- Update schema.prisma + run prisma migrate before changing services.
- Prefer relation IDs over denormalized fields to keep heat stats accurate.

### Common Utilities

**Path**: `backend/src/common`

**What it does**
- Shared filters, decorators (CurrentUser/Public), and health controller.
- ZodValidationPipe lives under utils to enforce DTO schemas.

**Key files**
- `backend/src/common/context/request-context.module.ts` — NestJS module wiring providers/controllers.
- `backend/src/common/context/request-context.service.ts` — Business logic service consumed by controllers.
- `backend/src/common/dto/id-param.dto.ts` — DTO or schema definition for request/response validation.
- `backend/src/common/health.controller.ts` — NestJS controller exposing HTTP routes.

**Important types/functions**
- `RequestContextModule`
- `RequestContextService`
- `IS_PUBLIC_KEY`
- `Public`
- `CurrentUser`
- `IdParamDto`
- `HttpExceptionFilter`
- `JwtAuthGuard`
- `HealthController`
- `RequestContextMiddleware`

**Invariants & contracts**
- ZodValidationPipe applies globally; DTOs must expose schema static properties.
- HealthController hides secrets by redacting database URL hostnames.

**Failure modes**
- Incorrect decorator usage prevents guards from injecting current user.
- Changing Zod factory signature requires updates across DTOs.

**How to extend / pitfalls**
- Add new decorators in common/decorators and export via index.ts.
- Keep utils free of Nest-specific references when possible for reuse.

### Ops & Config

**Path**: `docker-compose.yml`

**What it does**
- Dockerfiles + compose specs for backend/frontend/dev/prod along with scripts/use-env.js.

**Key files**
- `docker-compose.yml` — Source file.

**Important types/functions**
- (no exports detected)

**Invariants & contracts**
- Compose files expect .env.example variables; never commit real secrets.
- CI/CD should call npm scripts via root package for consistency.

**Failure modes**
- Mismatched port mappings break local dev proxies.
- Forgetting to rebuild images after env changes leads to stale configs.

**How to extend / pitfalls**
- Update compose.*.yml plus Dockerfile.* to add services.
- Keep scripts/refresh-context.sh runnable inside containers when needed.
