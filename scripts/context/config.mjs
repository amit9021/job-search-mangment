export const moduleSections = [
  {
    group: 'Backend Modules',
    modules: [
      {
        id: 'backend-auth',
        title: 'Auth',
        path: 'backend/src/modules/auth',
        tags: ['api', 'service'],
        what: [
          'Single-admin authentication using env-managed credentials and JWT issuance.',
          'Exposes /auth/login for token minting and /auth/me for session introspection.'
        ],
        invariants: [
          'Only the admin credentials defined via env/ConfigService are accepted; no multi-user state.',
          'Prisma upsert guarantees the backing User row exists for audit/logging.'
        ],
        failureModes: [
          'Invalid credentials raise UnauthorizedException, surfacing as HTTP 401.',
          'Missing JWT secret or expires-in configuration will produce unsigned/short-lived tokens.'
        ],
        extend: [
          'Add new login flows by expanding AuthService and wiring additional DTO validation.',
          'Keep JwtStrategy/guards aligned with any changes to the session payload.'
        ]
      },
      {
        id: 'backend-companies',
        title: 'Companies',
        path: 'backend/src/modules/companies',
        tags: ['api', 'service', 'db'],
        what: [
          'Maintains the catalog of companies tied to jobs and contacts.',
          'Provides search, create, update, and detail routes under /companies.'
        ],
        invariants: [
          'Names are deduplicated case-insensitively before insert to avoid duplicates.',
          'Each update ensures the company exists first to avoid silent creates.'
        ],
        failureModes: [
          'Unknown company IDs surface as NotFoundException.',
          'High-volume queries rely on DB indexes; missing indexes will regress list performance.'
        ],
        extend: [
          'Add new metadata fields by extending the Prisma model and DTOs together.',
          'When exposing derived stats, prefer Prisma projections over computed loops.'
        ]
      },
      {
        id: 'backend-contacts',
        title: 'Contacts',
        path: 'backend/src/modules/contacts',
        tags: ['api', 'service', 'db'],
        what: [
          'Manages networking contacts, their strength, and linkage to jobs/outreach.',
          'Supports rich filters (tags, last touch, company) and linking to companies.'
        ],
        invariants: [
          'Contacts default to non-archived view; includeArchived must be explicitly requested.',
          'Engagement scores derive from outreach/followup joins and require recent activity data.'
        ],
        failureModes: [
          'Missing company references trigger NotFoundException before writes.',
          'Large text searches may need additional DB indexes if new fields are added.'
        ],
        extend: [
          'Add new filters by updating the list query builder + DTO schema.',
          'Keep computed engagement helpers in sync when adding new touch types.'
        ]
      },
      {
        id: 'backend-jobs',
        title: 'Jobs',
        path: 'backend/src/modules/jobs',
        tags: ['api', 'service', 'db'],
        what: [
          'Owns the job pipeline: listing, creation, heat scoring, and stage tracking.',
          'Coordinates with Contacts/Followups/Outreach to surface linked activity.'
        ],
        invariants: [
          'Every create/update records stage history and recalculates heat rules.',
          'Heat computation depends on shared rules loaded via heat-rules.loader.'
        ],
        failureModes: [
          'Conflicting applications/outreach updates raise ConflictException.',
          'Missing job IDs bubble up as NotFoundException; archived jobs are skipped by default.'
        ],
        extend: [
          'Add new pipeline stages only after updating the Prisma enum, heat rules, and DTOs.',
          'Wrap multi-step mutations inside Prisma transactions to keep counts consistent.'
        ]
      },
      {
        id: 'backend-outreach',
        title: 'Outreach',
        path: 'backend/src/modules/outreach',
        tags: ['api', 'service'],
        what: [
          'Tracks outreach interactions by channel, personalization, and outcomes.',
          'Provides endpoints to log touches, mark responses, and find stale outreach needing action.'
        ],
        invariants: [
          'Channel and outcome enums must match the Prisma schema and frontend selects.',
          'Stale lookups rely on sentAt timestamps; ensure timezone handling uses dayjs helpers.'
        ],
        failureModes: [
          'Missing contact/job references raise NotFoundException before writes.',
          'High personalization scores without matching enums will fail DTO validation.'
        ],
        extend: [
          'Add new channels/outcomes by updating Prisma enums, DTO zod schemas, and frontend constants.',
          'Keep OutreachService.findStaleWithoutOutcome aligned with dashboard expectations.'
        ]
      },
      {
        id: 'backend-followups',
        title: 'Followups',
        path: 'backend/src/modules/followups',
        tags: ['api', 'service'],
        what: [
          'Schedules and completes follow-up reminders tied to jobs or contacts.',
          'Feeds the dashboard action queue with due/overdue tasks.'
        ],
        invariants: [
          'Each follow-up stores attempt numbers to keep outreach cadence predictable.',
          'Due date filters always return non-archived contacts/jobs.'
        ],
        failureModes: [
          'Marking a follow-up complete without a matching record throws NotFoundException.',
          'Timezone mistakes will shift dueAt comparisons; rely on shared dayjs config.'
        ],
        extend: [
          'Add new due buckets by updating FollowupsService getters and DTO enums.',
          'Any auto-generation logic should reuse TasksService to avoid duplicate reminders.'
        ]
      },
      {
        id: 'backend-dashboard',
        title: 'Dashboard',
        path: 'backend/src/modules/dashboard',
        tags: ['api', 'service', 'cache'],
        what: [
          'Aggregates KPI, task, outreach, and stats data into the mission-control summary.',
          'Caches per-user summaries with feature-flag control for Dashboard V1.'
        ],
        invariants: [
          'Accepted range values are limited to 7/14/30 days and sanitized server-side.',
          'Cache entries expire according to app.dashboard.cacheTtlSeconds.'
        ],
        failureModes: [
          'Downstream service timeouts flip the degraded flag but still deliver partial data.',
          'Dashboard feature flag false => controller returns 404 to hide the module.'
        ],
        extend: [
          'Use callWithTimeout helper when adding new dependencies to keep degraded semantics consistent.',
          'Remember to update DTOs when adding new queue/notification payloads.'
        ]
      },
      {
        id: 'backend-kpi',
        title: 'KPI',
        path: 'backend/src/modules/kpi',
        tags: ['api', 'service'],
        what: [
          'Calculates day/week KPIs such as CVs sent, outreach, follow-ups, and reviews.',
          'Serves chart-ready datasets consumed by the dashboard and legacy widgets.'
        ],
        invariants: [
          'KPI ranges default to the user timezone; keep TIMEZONE env in sync.',
          'Metrics rely on Prisma aggregations; ensure indexes exist when adding new ones.'
        ],
        failureModes: [
          'Invalid date ranges raise BadRequestException via DTO validation.',
          'Large time windows may cause slow Prisma scans without additional constraints.'
        ],
        extend: [
          'Add new KPI fields by extending dto outputs plus StatsService/TasksService feeders.',
          'Expose grouped metrics via dedicated DTOs rather than overloading existing endpoints.'
        ]
      },
      {
        id: 'backend-stats',
        title: 'Stats',
        path: 'backend/src/modules/stats',
        tags: ['api', 'service'],
        what: [
          'Produces weekly series for CVs, outreach, follow-ups, and heat buckets.',
          'Backs the dashboard charts and legacy timeline components.'
        ],
        invariants: [
          'All queries are time-zone aware and normalized via shared dayjs instance.',
          'Weekly summaries clamp to allowed windows (7/14/30).'
        ],
        failureModes: [
          'Missing data returns zeroed StatsWeeklySummaryDto but still sets degraded flags.',
          'Misconfigured timezone will skew bucket boundaries and degrade insights.'
        ],
        extend: [
          'Use addSeries helper when layering new metrics so the frontend receives consistent shapes.',
          'Update tests/fixtures when introducing new data points.'
        ]
      },
      {
        id: 'backend-tasks',
        title: 'Tasks',
        path: 'backend/src/modules/tasks',
        tags: ['api', 'service'],
        what: [
          'Crud + automation endpoints for personal tasks and follow-up automation.',
          'Includes helper utilities (parser/snooze/kpis) that power dashboard suggestions.'
        ],
        invariants: [
          'Automation endpoints require idempotent task IDs so scheduler retries stay safe.',
          'Actionable-task queries always normalize timezone from TIMEZONE env.'
        ],
        failureModes: [
          'Missing tasks raise NotFoundException in service methods.',
          'Parsing cron-like recurrence strings without validation can break scheduling.'
        ],
        extend: [
          'Add new automation flows under tasks/automation.controller + service pair.',
          'Reuse task-parser utilities when introducing new recurrence types.'
        ]
      },
      {
        id: 'backend-notifications',
        title: 'Notifications',
        path: 'backend/src/modules/notifications',
        tags: ['api', 'service'],
        what: [
          'Stores lightweight reminders (dueAt/sentAt) derived from tasks/outreach.',
          'Serves digest/list endpoints for dashboard cards.'
        ],
        invariants: [
          'Notification kinds map directly to frontend badges; update enums in tandem.',
          'Due queries default to today; clients must request other windows explicitly.'
        ],
        failureModes: [
          'Sending without a job/contact association may fail DTO validation.',
          'Deleting already sent notifications returns NotFoundException.'
        ],
        extend: [
          'Add categorization by expanding Notification entity + DTO + React hooks.',
          'Prefer TTL indexes if volume grows (currently Prisma-managed).'
        ]
      },
      {
        id: 'backend-projects',
        title: 'Projects & Reviews',
        path: 'backend/src/modules/projects',
        tags: ['api', 'service'],
        what: [
          'Tracks personal projects plus incoming/outgoing code reviews.',
          'Feeds growth/Grow module with spotlight-ready items.'
        ],
        invariants: [
          'Project highlights set spotlight flags that the frontend relies on for layout.',
          'Review completion toggles reviewedAt and must stay consistent with Growth metrics.'
        ],
        failureModes: [
          'Deleting linked projects without cascading reviews leads to referential integrity errors.',
          'Missing reviewer/contact relations raise NotFoundException.'
        ],
        extend: [
          'Add new project metadata by updating Prisma + DTOs, then regenerate context.',
          'When integrating third-party repos, sanitize repoUrl before storing.'
        ]
      },
      {
        id: 'backend-grow',
        title: 'Grow',
        path: 'backend/src/modules/grow',
        tags: ['api', 'service'],
        what: [
          'Combines GrowthReview, GrowthEvent, and GrowthBoostTask data for skills ramp.',
          'Exposes summary endpoints under /grow for the dedicated page.'
        ],
        invariants: [
          'Growth boost tasks categorized by impactLevel; keep values within 1-5 scale.',
          'Reviews must link to contacts for contextual follow-ups.'
        ],
        failureModes: [
          'Attempting to complete nonexistent growth tasks raises NotFoundException.',
          'Leaving reviewer/contact IDs blank violates Prisma schema.'
        ],
        extend: [
          'Consider using transactions when updating review plus growth stats simultaneously.',
          'Add new categories/tags via Prisma enums + React filters.'
        ]
      },
      {
        id: 'backend-boosts',
        title: 'Boosts',
        path: 'backend/src/modules/boosts',
        tags: ['api', 'service'],
        what: [
          'Lightweight backlog of “boost” tasks scored by impact to unblock the search.',
          'Routes cover list/create/complete/reopen/delete under /boosts.'
        ],
        invariants: [
          'Impact scores are simple integers; keep DTO validation tight to avoid noisy data.',
          'Completing a boost stamps doneAt via shared dayjs helper.'
        ],
        failureModes: [
          'Completing missing IDs raises NotFoundException.',
          'Reopen/delete operations rely on optimistic updates; double-submit will error.'
        ],
        extend: [
          'Add prioritization fields by extending Prisma + React data grids.',
          'Batch-complete flows should wrap operations in Prisma transactions.'
        ]
      },
      {
        id: 'backend-events',
        title: 'Events',
        path: 'backend/src/modules/events',
        tags: ['api', 'service'],
        what: [
          'Manages networking events plus contact links (EventContact).',
          'Feeds follow-up scheduling after events through eventContacts.'
        ],
        invariants: [
          'Event status limited to PLANNED/ATTENDED; update enums everywhere before adding more.',
          'Follow-up due dates stay optional; null values signal no obligation.'
        ],
        failureModes: [
          'Removing events cascades to EventContact; ensure Prisma relations stay consistent.',
          'Invalid dates or negative conversation targets fail DTO validation.'
        ],
        extend: [
          'Add location/timezone data carefully—frontend expects ISO strings.',
          'Bulk import should dedupe contacts via ContactsService.'
        ]
      },
      {
        id: 'backend-referrals',
        title: 'Referrals',
        path: 'backend/src/modules/referrals',
        tags: ['api', 'service'],
        what: [
          'Logs referral/intro attempts tied to contacts and jobs.',
          'Supports listing, creation, and status reporting for referral analytics.'
        ],
        invariants: [
          'ReferralKind enum drives both backend validation and React display.',
          'Timestamps default to now; clients rarely send explicit values.'
        ],
        failureModes: [
          'Invalid job/contact IDs raise NotFoundException.',
          'Missing referral kind/notes fail Zod validation.'
        ],
        extend: [
          'Use Prisma include to pull related job/contact details when adding new endpoints.',
          'Add referral scoring inside service, not the controller.'
        ]
      },
      {
        id: 'backend-recommendation',
        title: 'Recommendations',
        path: 'backend/src/modules/recommendation',
        tags: ['api', 'service'],
        what: [
          'Stores automated recommendation payloads (kind + JSON) for the dashboard assistant.',
          'Routes include create/list/resolve for Next Best Action features.'
        ],
        invariants: [
          'Payload stays as Json column; keep schemas documented in dto definitions.',
          'Resolved recommendations carry resolvedAt timestamps for auditing.'
        ],
        failureModes: [
          'Resolving already-resolved items is idempotent but still queries the DB.',
          'Large payloads (>1MB) will exceed Postgres limits; avoid dumping huge context.'
        ],
        extend: [
          'When adding new recommendation kinds, update DTO union + frontend cards.',
          'Prefer storing normalized references (jobId/contactId) inside payload for joins.'
        ]
      },
      {
        id: 'backend-reviews',
        title: 'Code Reviews',
        path: 'backend/src/modules/reviews',
        tags: ['api', 'service'],
        what: [
          'Captures code review activity tied to projects/contacts for growth tracking.',
          'Enables creation/list/update of CodeReview entries.'
        ],
        invariants: [
          'Requests must reference both projectId and contactId; Zod enforces presence.',
          'Quality scores stored as ints; stay within agreed 1–5 scale.'
        ],
        failureModes: [
          'Deleting referenced projects triggers referential errors; cascade carefully.',
          'Incomplete DTO payloads fail validation with descriptive messages.'
        ],
        extend: [
          'Extend GrowthReview reporting to include review stats if needed.',
          'Add filtering/sorting options by enhancing controller query DTO.'
        ]
      },
    ]
  },
  {
    group: 'Frontend Surface',
    modules: [
      {
        id: 'frontend-shell',
        title: 'Shell & Routing',
        path: 'frontend/src',
        tags: ['ui'],
        what: [
          'React Router shell (App.tsx + ShellLayout) gating auth and wiring top-level routes.'
        ],
        invariants: [
          'Auth gating depends on Zustand session store; always update store before navigating.',
          'ShellLayout assumes routes provide Outlet-friendly children.'
        ],
        failureModes: [
          'Missing token redirects to /login immediately.',
          'Adding new routes without ShellLayout updates may leave nav links stale.'
        ],
        extend: [
          'Add new pages by registering routes + nav items together.',
          'Keep lazy imports chunked if route bundles grow.'
        ]
      },
      {
        id: 'frontend-dashboard',
        title: 'Dashboard Page',
        path: 'frontend/src/pages/DashboardPage.tsx',
        tags: ['ui'],
        what: [
          'Mission-control layout combining charts, KPI tiles, action center, and follow-up lists.',
          'Supports Legacy view fallback gated by VITE_DASHBOARD_V1.'
        ],
        invariants: [
          'Range selector limited to 7/14/30; matches backend dashboard guard.',
          'Summary + stats hooks refetch in sync to keep degrade banner accurate.'
        ],
        failureModes: [
          'If summary hook errors, page renders “Dashboard unavailable” block instead of crashing.',
          'Missing meta data toggles degrade indicator incorrectly.'
        ],
        extend: [
          'Add new widgets by placing them inside the CSS grid and wiring new hooks/chunks.',
          'Legacy view should stay untouched unless V1 flag removed.'
        ]
      },
      {
        id: 'frontend-jobs',
        title: 'Jobs Page',
        path: 'frontend/src/pages/JobsPage.tsx',
        tags: ['ui'],
        what: [
          'Jobs table + filters view for managing pipeline heat/stage.',
          'Integrates with dashboard deep links via query params.'
        ],
        invariants: [
          'Expects backend to supply heat/stage enumerations; keep enums aligned.',
          'Pagination/filter state stored in URL search params.'
        ],
        failureModes: [
          'Breaking API contract on job list will blank the table.',
          'Missing focus ID param will fallback to default selection.'
        ],
        extend: [
          'Add columns via shared table components to keep virtualization consistent.',
          'Leverage useJobs hook for data rather than calling axios directly.'
        ]
      },
      {
        id: 'frontend-contacts',
        title: 'Contacts Page',
        path: 'frontend/src/pages/ContactsPage.tsx',
        tags: ['ui'],
        what: [
          'Contact directory with filters for strength, tags, last touch, and company.',
          'Shows linked jobs/outreach/follow-ups in side panels.'
        ],
        invariants: [
          'Relies on ContactsService to include linkedJobs/follow-ups; keep DTO names stable.',
          'Archived toggle defaults to false.'
        ],
        failureModes: [
          'Missing follow-up data leads to undefined next follow-up rows.',
          'Large tag filters can degrade performance; debounce inputs.'
        ],
        extend: [
          'Add CSV export by reusing manifest metadata from backend list endpoint.',
          'Break UI into smaller components before adding more filters.'
        ]
      },
      {
        id: 'frontend-tasks',
        title: 'Tasks Page',
        path: 'frontend/src/pages/TasksPage.tsx',
        tags: ['ui'],
        what: [
          'Task management board plus automation toggles.',
          'Surfaces actionable tasks that align with dashboard queue.'
        ],
        invariants: [
          'Task filters mirror backend statuses (Todo/Doing/Done).',
          'Automation toggles expect backend automation endpoints to exist.'
        ],
        failureModes: [
          'Missing statuses break column rendering.',
          'Optimistic updates must match backend payload shape.'
        ],
        extend: [
          'Add board columns by updating both constants and CSS grid.',
          'Prefer React Query mutations for concurrency safety.'
        ]
      },
      {
        id: 'frontend-grow',
        title: 'Grow Page',
        path: 'frontend/src/pages/GrowPage.tsx',
        tags: ['ui'],
        what: [
          'Growth-focused dashboard mixing reviews, boost tasks, and events.',
          'Enables planning upcoming outreach tied to learning goals.'
        ],
        invariants: [
          'Assumes Growth API returns reviews/events/boost tasks arrays.',
          'Heatmap/timeline components expect ISO dates.'
        ],
        failureModes: [
          'If any dataset fails, page shows empty state but stays mounted.',
          'Mismatched enums (impactLevel/status) break badges.'
        ],
        extend: [
          'Modularize sections before adding new growth metrics.',
          'Keep design tokens consistent with dashboard cards.'
        ]
      },
      {
        id: 'frontend-api',
        title: 'API Layer',
        path: 'frontend/src/api',
        tags: ['api', 'client'],
        what: [
          'Axios client factory with auth interceptor plus React Query hooks for dashboard/stats.',
          'Centralizes API_BASE_URL + unauthorized handling.'
        ],
        invariants: [
          'All hooks call createApiClient through ApiProvider to guarantee headers.',
          'Unauthorized responses trigger session clearing.'
        ],
        failureModes: [
          'Missing token leads to 401 loops unless onUnauthorized resets state.',
          'Environment variable VITE_API_URL must include protocol.'
        ],
        extend: [
          'Define new typed hooks in frontend/src/api/hooks.ts to keep caching consistent.',
          'Share DTO types with backend via generated types if duplication grows.'
        ]
      },
      {
        id: 'frontend-components-dashboard',
        title: 'Dashboard Components',
        path: 'frontend/src/components/dashboard',
        tags: ['ui'],
        what: [
          'Composable tiles/charts/widgets (KpiMiniTiles, NextBestActionCompact, Chart*).'
        ],
        invariants: [
          'Each component is display-only; data fetching stays in DashboardPage.',
          'Charts rely on Recharts stub during tests; keep API stable.'
        ],
        failureModes: [
          'Missing props (loading/data) break skeleton states.',
          'High-frequency updates require memoization to avoid jank.'
        ],
        extend: [
          'Add new widgets by following the same prop signatures (loading/degraded).',
          'Keep CSS grid measurements consistent for 12-column layout.'
        ]
      },
      {
        id: 'frontend-store',
        title: 'Session Store',
        path: 'frontend/src/stores/session.ts',
        tags: ['state'],
        what: [
          'Zustand store persisting token + user profile to localStorage.',
          'Drives auth gating and API header injection.'
        ],
        invariants: [
          'Storage key job-hunt-session must stay stable to avoid forced logouts.',
          'clear() resets both token and user atomically.'
        ],
        failureModes: [
          'Persist middleware requires JSON-serializable state; do not add functions.',
          'Token mismatch vs HTTP-only cookie causes split-brain sessions.'
        ],
        extend: [
          'Add metadata (e.g., roles) by expanding SessionUser type and store setters.',
          'Keep migrations in mind when evolving persisted structure.'
        ]
      }
    ]
  },
  {
    group: 'Infrastructure',
    modules: [
      {
        id: 'backend-prisma',
        title: 'Prisma Layer',
        path: 'backend/src/prisma',
        tags: ['db'],
        what: [
          'PrismaService manages DB connections + env resolution; schema defines jobs/contacts/etc.',
          'Seed script populates mock data plus bootstrap admin credentials.'
        ],
        invariants: [
          'DATABASE_URL is derived from NODE_ENV-specific envs when available.',
          'All relations use cuid IDs; cascading deletes require manual implementation.'
        ],
        failureModes: [
          'Missing DATABASE_URL_* envs cause runtime errors during Prisma bootstrap.',
          'Binary target mismatch requires regenerating Prisma client.'
        ],
        extend: [
          'Update schema.prisma + run prisma migrate before changing services.',
          'Prefer relation IDs over denormalized fields to keep heat stats accurate.'
        ]
      },
      {
        id: 'backend-common',
        title: 'Common Utilities',
        path: 'backend/src/common',
        tags: ['util'],
        what: [
          'Shared filters, decorators (CurrentUser/Public), and health controller.',
          'ZodValidationPipe lives under utils to enforce DTO schemas.'
        ],
        invariants: [
          'ZodValidationPipe applies globally; DTOs must expose schema static properties.',
          'HealthController hides secrets by redacting database URL hostnames.'
        ],
        failureModes: [
          'Incorrect decorator usage prevents guards from injecting current user.',
          'Changing Zod factory signature requires updates across DTOs.'
        ],
        extend: [
          'Add new decorators in common/decorators and export via index.ts.',
          'Keep utils free of Nest-specific references when possible for reuse.'
        ]
      },
      {
        id: 'ops-config',
        title: 'Ops & Config',
        path: 'docker-compose.yml',
        tags: ['ops'],
        what: [
          'Dockerfiles + compose specs for backend/frontend/dev/prod along with scripts/use-env.js.'
        ],
        invariants: [
          'Compose files expect .env.example variables; never commit real secrets.',
          'CI/CD should call npm scripts via root package for consistency.'
        ],
        failureModes: [
          'Mismatched port mappings break local dev proxies.',
          'Forgetting to rebuild images after env changes leads to stale configs.'
        ],
        extend: [
          'Update compose.*.yml plus Dockerfile.* to add services.',
          'Keep scripts/refresh-context.sh runnable inside containers when needed.'
        ]
      }
    ]
  }
];

export const chunkDefinitions = [
  {
    id: 'chunk-backend-auth',
    title: 'Backend · Auth HTTP + Service',
    module: 'backend-auth',
    sourcePaths: [
      'backend/src/modules/auth/auth.controller.ts',
      'backend/src/modules/auth/auth.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'POST /auth/login validates env-managed admin credentials and mints JWT tokens.',
      'GET /auth/me returns the injected @CurrentUser detail for nav/session bootstrap.',
      'Service upserts the admin User row before issuing tokens to keep analytics alive.'
    ],
    related: ['chunk-backend-prisma']
  },
  {
    id: 'chunk-backend-jobs',
    title: 'Backend · Jobs Controller & Service',
    module: 'backend-jobs',
    sourcePaths: [
      'backend/src/modules/jobs/jobs.controller.ts',
      'backend/src/modules/jobs/jobs.service.ts'
    ],
    tags: ['api', 'service', 'db'],
    summary: [
      'Handles job pipeline CRUD plus stage/heat automation under /jobs.',
      'Service composes Contacts/Followups/Outreach services to compute linked metrics.',
      'Includes outreach/application helper DTOs for initial job bootstrap.'
    ],
    related: ['chunk-backend-contacts', 'chunk-backend-followups', 'chunk-backend-outreach']
  },
  {
    id: 'chunk-backend-contacts',
    title: 'Backend · Contacts API',
    module: 'backend-contacts',
    sourcePaths: [
      'backend/src/modules/contacts/contacts.controller.ts',
      'backend/src/modules/contacts/contacts.service.ts'
    ],
    tags: ['api', 'service', 'db'],
    summary: [
      'GET /contacts supports filters (query, strength, tags, lastTouch) with pagination.',
      'POST/PATCH routes manage contact metadata plus company linkage.',
      'Service augments contacts with linked jobs, outreach, and follow-up snapshots.'
    ],
    related: ['chunk-backend-companies', 'chunk-backend-jobs']
  },
  {
    id: 'chunk-backend-companies',
    title: 'Backend · Companies API',
    module: 'backend-companies',
    sourcePaths: [
      'backend/src/modules/companies/companies.controller.ts',
      'backend/src/modules/companies/companies.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Provides create/list/detail/update routes under /companies for deduped company records.',
      'Service enforces case-insensitive uniqueness and returns relation counts.'
    ],
    related: ['chunk-backend-contacts', 'chunk-backend-jobs']
  },
  {
    id: 'chunk-backend-outreach',
    title: 'Backend · Outreach API',
    module: 'backend-outreach',
    sourcePaths: [
      'backend/src/modules/outreach/outreach.controller.ts',
      'backend/src/modules/outreach/outreach.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Records outreach attempts, personalization scores, and outcomes under /outreach.',
      'Provides stale outreach queries feeding the dashboard follow-up queue.'
    ],
    related: ['chunk-backend-followups', 'chunk-backend-jobs']
  },
  {
    id: 'chunk-backend-followups',
    title: 'Backend · Follow-ups API',
    module: 'backend-followups',
    sourcePaths: [
      'backend/src/modules/followups/followups.controller.ts',
      'backend/src/modules/followups/followups.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Schedules follow-up reminders and exposes due/overdue buckets for action center.',
      'Service filters archived contacts/jobs and tracks attempt numbers.'
    ],
    related: ['chunk-backend-outreach', 'chunk-backend-tasks']
  },
  {
    id: 'chunk-backend-dashboard',
    title: 'Backend · Dashboard Aggregator',
    module: 'backend-dashboard',
    sourcePaths: [
      'backend/src/modules/dashboard/dashboard.controller.ts',
      'backend/src/modules/dashboard/dashboard.service.ts'
    ],
    tags: ['api', 'service', 'cache'],
    summary: [
      'GET /dashboard/summary fetches KPI/tasks/outreach/stats in parallel with caching.',
      'Service orchestrates seven downstream modules and exposes degraded/cache headers.'
    ],
    related: [
      'chunk-backend-kpi',
      'chunk-backend-tasks',
      'chunk-backend-stats',
      'chunk-backend-outreach'
    ]
  },
  {
    id: 'chunk-backend-kpi',
    title: 'Backend · KPI API',
    module: 'backend-kpi',
    sourcePaths: [
      'backend/src/modules/kpi/kpi.controller.ts',
      'backend/src/modules/kpi/kpi.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Offers /kpis/today and /kpis/week endpoints for dashboard cards.',
      'Service aggregates Prisma stats with timezone-aware filters.'
    ],
    related: ['chunk-backend-stats', 'chunk-backend-dashboard']
  },
  {
    id: 'chunk-backend-stats',
    title: 'Backend · Stats Service',
    module: 'backend-stats',
    sourcePaths: [
      'backend/src/modules/stats/stats.controller.ts',
      'backend/src/modules/stats/stats.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Provides /stats/weekly endpoint returning sparkline-ready series.',
      'Service builds aggregated metrics (CVs, outreach, follow-ups, heat) with degrade tracking.'
    ],
    related: ['chunk-backend-dashboard', 'chunk-backend-kpi']
  },
  {
    id: 'chunk-backend-tasks',
    title: 'Backend · Tasks & Automation',
    module: 'backend-tasks',
    sourcePaths: [
      'backend/src/modules/tasks/tasks.controller.ts',
      'backend/src/modules/tasks/automation.controller.ts',
      'backend/src/modules/tasks/tasks.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'CRUD endpoints for tasks plus automation controls at /tasks and /automation.',
      'Service exposes getActionableTasks powering dashboard queue.'
    ],
    related: ['chunk-backend-dashboard', 'chunk-backend-followups']
  },
  {
    id: 'chunk-backend-notifications',
    title: 'Backend · Notifications API',
    module: 'backend-notifications',
    sourcePaths: [
      'backend/src/modules/notifications/notifications.controller.ts',
      'backend/src/modules/notifications/notifications.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'REST routes for listing/creating/dismissing lightweight notifications.',
      'Service wires notifications into dashboard alert surfaces.'
    ],
    related: ['chunk-backend-dashboard', 'chunk-backend-tasks']
  },
  {
    id: 'chunk-backend-projects',
    title: 'Backend · Projects & Reviews',
    module: 'backend-projects',
    sourcePaths: [
      'backend/src/modules/projects/projects.controller.ts',
      'backend/src/modules/projects/projects.service.ts',
      'backend/src/modules/reviews/reviews.controller.ts',
      'backend/src/modules/reviews/reviews.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Projects API tracks repo highlights; Reviews API logs code review interactions.',
      'Feeds Grow experience and growth metrics.'
    ],
    related: ['chunk-backend-grow']
  },
  {
    id: 'chunk-backend-grow',
    title: 'Backend · Grow API',
    module: 'backend-grow',
    sourcePaths: [
      'backend/src/modules/grow/grow.controller.ts',
      'backend/src/modules/grow/grow.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Aggregates growth reviews, boost tasks, and events for /grow endpoints.',
      'Provides mutation endpoints for GrowthBoostTask lifecycle.'
    ],
    related: ['chunk-backend-projects', 'chunk-backend-boosts']
  },
  {
    id: 'chunk-backend-boosts',
    title: 'Backend · Boost Tasks',
    module: 'backend-boosts',
    sourcePaths: [
      'backend/src/modules/boosts/boosts.controller.ts',
      'backend/src/modules/boosts/boosts.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Manages short, high-impact boost tasks under /boosts list/create/update/delete routes.'
    ],
    related: ['chunk-backend-grow']
  },
  {
    id: 'chunk-backend-events',
    title: 'Backend · Events API',
    module: 'backend-events',
    sourcePaths: [
      'backend/src/modules/events/events.controller.ts',
      'backend/src/modules/events/events.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'CRUD endpoints for networking events plus contact follow-up links.'
    ],
    related: ['chunk-backend-contacts']
  },
  {
    id: 'chunk-backend-referrals',
    title: 'Backend · Referrals API',
    module: 'backend-referrals',
    sourcePaths: [
      'backend/src/modules/referrals/referrals.controller.ts',
      'backend/src/modules/referrals/referrals.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Captures referral attempts/notes and ties them to contacts + jobs.'
    ],
    related: ['chunk-backend-contacts', 'chunk-backend-jobs']
  },
  {
    id: 'chunk-backend-recommendation',
    title: 'Backend · Recommendations API',
    module: 'backend-recommendation',
    sourcePaths: [
      'backend/src/modules/recommendation/recommendation.controller.ts',
      'backend/src/modules/recommendation/recommendation.service.ts'
    ],
    tags: ['api', 'service'],
    summary: [
      'Stores/resolves recommendation payloads shown as Next Best Actions.'
    ],
    related: ['chunk-backend-dashboard']
  },
  {
    id: 'chunk-backend-prisma',
    title: 'Backend · Prisma Service & Schema',
    module: 'backend-prisma',
    sourcePaths: [
      'backend/src/prisma/prisma.service.ts',
      'prisma/schema.prisma'
    ],
    tags: ['db'],
    summary: [
      'PrismaService picks DATABASE_URL based on NODE_ENV and instantiates the client.',
      'schema.prisma defines jobs/contacts/outreach/followups/etc using cuid IDs.'
    ],
    related: [
      'chunk-backend-jobs',
      'chunk-backend-contacts',
      'chunk-backend-dashboard'
    ]
  },
  {
    id: 'chunk-frontend-api',
    title: 'Frontend · API Layer',
    module: 'frontend-api',
    sourcePaths: [
      'frontend/src/api/client.ts',
      'frontend/src/api/hooks.ts',
      'frontend/src/api/useDashboard.ts',
      'frontend/src/api/useStats.ts'
    ],
    tags: ['client', 'ui'],
    summary: [
      'Axios client with auth interceptor plus React Query hooks for dashboard/stats/KPIs.'
    ],
    related: ['chunk-frontend-dashboard', 'chunk-frontend-shell']
  },
  {
    id: 'chunk-frontend-shell',
    title: 'Frontend · Shell & Session',
    module: 'frontend-shell',
    sourcePaths: [
      'frontend/src/App.tsx',
      'frontend/src/layouts/ShellLayout.tsx',
      'frontend/src/stores/session.ts'
    ],
    tags: ['ui', 'state'],
    summary: [
      'Router gating around Zustand session store and shared shell layout.'
    ],
    related: ['chunk-frontend-api']
  },
  {
    id: 'chunk-frontend-dashboard',
    title: 'Frontend · Dashboard Page',
    module: 'frontend-dashboard',
    sourcePaths: [
      'frontend/src/pages/DashboardPage.tsx',
      'frontend/src/components/dashboard/KpiMiniTiles.tsx',
      'frontend/src/components/dashboard/ChartWarmOutreach.tsx',
      'frontend/src/components/dashboard/ChartCvsSent.tsx',
      'frontend/src/components/dashboard/NextBestActionCompact.tsx',
      'frontend/src/components/dashboard/ActionCenterTabs.tsx',
      'frontend/src/components/dashboard/InsightsMini.tsx',
      'frontend/src/components/dashboard/ChartFollowupsPie.tsx'
    ],
    tags: ['ui'],
    summary: [
      'Composes mission-control grid plus KPI tiles, charts, action center, and legacy fallback.'
    ],
    related: ['chunk-frontend-api']
  },
  {
    id: 'chunk-frontend-pages',
    title: 'Frontend · Entity Pages',
    module: 'frontend-pages',
    sourcePaths: [
      'frontend/src/pages/JobsPage.tsx',
      'frontend/src/pages/ContactsPage.tsx',
      'frontend/src/pages/GrowPage.tsx',
      'frontend/src/pages/TasksPage.tsx'
    ],
    tags: ['ui'],
    summary: [
      'Jobs, Contacts, Grow, and Tasks pages hooking into respective backend modules.'
    ],
    related: ['chunk-frontend-api', 'chunk-frontend-shell']
  }
];

export default {
  moduleSections,
  chunkDefinitions
};
