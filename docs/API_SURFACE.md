# API Surface

Generated: 2025-11-13T13:59:07.988Z

## HTTP Routes

| Method | Path | Handler | Request | Response |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | `login` (backend/src/modules/auth/auth.controller.ts) | body: LoginDto | unknown |
| POST | `/auth/logout` | `logout` (backend/src/modules/auth/auth.controller.ts) | — | unknown |
| GET | `/auth/me` | `me` (backend/src/modules/auth/auth.controller.ts) | user: AuthProfile | unknown |
| GET | `/auth/oauth/:provider` | `authorize` (backend/src/modules/auth/oauth/oauth.controller.ts) | provider: string | unknown |
| GET | `/auth/oauth/:provider/callback` | `callback` (backend/src/modules/auth/oauth/oauth.controller.ts) | provider: string, code: string | unknown |
| POST | `/auth/register` | `register` (backend/src/modules/auth/auth.controller.ts) | body: RegisterDto | unknown |
| POST | `/automation/outreach-created` | `outreachCreated` (backend/src/modules/tasks/automation.controller.ts) | body: OutreachAutomationDto | unknown |
| GET | `/boosts` | `list` (backend/src/modules/boosts/boosts.controller.ts) | — | unknown |
| POST | `/boosts` | `create` (backend/src/modules/boosts/boosts.controller.ts) | body: CreateBoostTaskDto | unknown |
| DELETE | `/boosts/:id` | `delete` (backend/src/modules/boosts/boosts.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/boosts/:id/complete` | `complete` (backend/src/modules/boosts/boosts.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/boosts/:id/reopen` | `reopen` (backend/src/modules/boosts/boosts.controller.ts) | params: IdParamDto | unknown |
| GET | `/companies` | `list` (backend/src/modules/companies/companies.controller.ts) | query: string | unknown |
| POST | `/companies` | `create` (backend/src/modules/companies/companies.controller.ts) | body: CreateCompanyDto | unknown |
| GET | `/companies/:id` | `findById` (backend/src/modules/companies/companies.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/companies/:id` | `update` (backend/src/modules/companies/companies.controller.ts) | params: IdParamDto, body: UpdateCompanyDto | unknown |
| GET | `/contacts` | `list` (backend/src/modules/contacts/contacts.controller.ts) | query: ListContactsQueryDto | unknown |
| POST | `/contacts` | `create` (backend/src/modules/contacts/contacts.controller.ts) | body: CreateContactDto | unknown |
| DELETE | `/contacts/:id` | `delete` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto, hard: string | unknown |
| GET | `/contacts/:id` | `getById` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/contacts/:id` | `update` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto, body: UpdateContactDto | unknown |
| GET | `/contacts/:id/heat` | `heat` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto | unknown |
| POST | `/contacts/:id/outreach` | `outreach` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto, body: CreateContactOutreachDto | unknown |
| POST | `/contacts/:id/referrals` | `referral` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto, body: CreateReferralDto | unknown |
| POST | `/contacts/:id/reviews` | `review` (backend/src/modules/contacts/contacts.controller.ts) | params: IdParamDto, body: CreateReviewDto | unknown |
| GET | `/contacts/stars` | `stars` (backend/src/modules/contacts/contacts.controller.ts) | — | unknown |
| GET | `/dashboard/summary` | `getSummary` (backend/src/modules/dashboard/dashboard.controller.ts) | user: { id?: string } | null, force: string, range: string, res: Response | Promise<DashboardSummaryDto> |
| GET | `/events` | `list` (backend/src/modules/events/events.controller.ts) | — | unknown |
| POST | `/events` | `create` (backend/src/modules/events/events.controller.ts) | body: CreateEventDto | unknown |
| PATCH | `/events/:id` | `update` (backend/src/modules/events/events.controller.ts) | params: IdParamDto, body: UpdateEventDto | unknown |
| POST | `/events/:id/attend` | `attend` (backend/src/modules/events/events.controller.ts) | params: IdParamDto, body: AttendEventDto | unknown |
| POST | `/events/:id/contacts` | `addContact` (backend/src/modules/events/events.controller.ts) | params: IdParamDto, body: AddEventContactDto | unknown |
| GET | `/followups` | `list` (backend/src/modules/followups/followups.controller.ts) | query: FollowupQueryDto | unknown |
| POST | `/followups` | `schedule` (backend/src/modules/followups/followups.controller.ts) | body: CreateFollowupDto | unknown |
| DELETE | `/followups/:id` | `delete` (backend/src/modules/followups/followups.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/followups/:id` | `update` (backend/src/modules/followups/followups.controller.ts) | params: IdParamDto, body: UpdateFollowupDto | unknown |
| PATCH | `/followups/:id/send` | `markSent` (backend/src/modules/followups/followups.controller.ts) | params: IdParamDto, body: SendFollowupDto | unknown |
| GET | `/grow/boost` | `listBoostTasks` (backend/src/modules/grow/grow.controller.ts) | — | unknown |
| POST | `/grow/boost` | `createBoostTask` (backend/src/modules/grow/grow.controller.ts) | body: CreateGrowthBoostTaskDto | unknown |
| PATCH | `/grow/boost/:id` | `updateBoostTask` (backend/src/modules/grow/grow.controller.ts) | params: IdParamDto, body: UpdateGrowthBoostTaskDto | unknown |
| GET | `/grow/boost/suggest` | `suggestBoostTasks` (backend/src/modules/grow/grow.controller.ts) | — | unknown |
| GET | `/grow/events` | `listEvents` (backend/src/modules/grow/grow.controller.ts) | — | unknown |
| POST | `/grow/events` | `createEvent` (backend/src/modules/grow/grow.controller.ts) | body: CreateGrowthEventDto | unknown |
| GET | `/grow/projects` | `listProjectHighlights` (backend/src/modules/grow/grow.controller.ts) | — | unknown |
| POST | `/grow/projects` | `createProjectHighlight` (backend/src/modules/grow/grow.controller.ts) | body: CreateProjectHighlightDto | unknown |
| PATCH | `/grow/projects/:id` | `updateProjectHighlight` (backend/src/modules/grow/grow.controller.ts) | params: IdParamDto, body: UpdateProjectHighlightDto | unknown |
| GET | `/grow/reviews` | `listReviews` (backend/src/modules/grow/grow.controller.ts) | — | unknown |
| POST | `/grow/reviews` | `createReview` (backend/src/modules/grow/grow.controller.ts) | body: CreateGrowthReviewDto | unknown |
| GET | `/health` | `health` (backend/src/common/health.controller.ts) | — | unknown |
| GET | `/jobs` | `list` (backend/src/modules/jobs/jobs.controller.ts) | query: ListJobsQueryDto | unknown |
| POST | `/jobs` | `create` (backend/src/modules/jobs/jobs.controller.ts) | body: CreateJobDto | unknown |
| DELETE | `/jobs/:id` | `delete` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, hard: string | unknown |
| GET | `/jobs/:id` | `getById` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/jobs/:id` | `update` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, body: UpdateJobDto | unknown |
| POST | `/jobs/:id/applications` | `addApplication` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, body: AddApplicationDto | unknown |
| GET | `/jobs/:id/heat-explain` | `heatExplain` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto | unknown |
| GET | `/jobs/:id/history` | `history` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto | unknown |
| POST | `/jobs/:id/notes` | `addNote` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, body: CreateJobNoteDto, user: { id?: string | null } | unknown |
| DELETE | `/jobs/:id/notes/:noteId` | `deleteNote` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, noteId: string | unknown |
| PATCH | `/jobs/:id/notes/:noteId` | `updateNote` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, noteId: string, body: UpdateJobNoteDto | unknown |
| POST | `/jobs/:id/outreach` | `addOutreach` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, body: CreateJobOutreachDto | unknown |
| POST | `/jobs/:id/status` | `updateStatus` (backend/src/modules/jobs/jobs.controller.ts) | params: IdParamDto, body: UpdateJobStageDto | unknown |
| GET | `/kpis/today` | `today` (backend/src/modules/kpi/kpi.controller.ts) | — | unknown |
| GET | `/kpis/week` | `week` (backend/src/modules/kpi/kpi.controller.ts) | — | unknown |
| GET | `/notifications` | `list` (backend/src/modules/notifications/notifications.controller.ts) | query: ListNotificationsQueryDto | unknown |
| PATCH | `/notifications/:id/send` | `markSent` (backend/src/modules/notifications/notifications.controller.ts) | params: IdParamDto | unknown |
| GET | `/outreach` | `list` (backend/src/modules/outreach/outreach.controller.ts) | query: ListOutreachQueryDto | unknown |
| POST | `/outreach` | `create` (backend/src/modules/outreach/outreach.controller.ts) | body: CreateOutreachDto | unknown |
| DELETE | `/outreach/:id` | `remove` (backend/src/modules/outreach/outreach.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/outreach/:id` | `update` (backend/src/modules/outreach/outreach.controller.ts) | params: IdParamDto, body: UpdateOutreachDto | unknown |
| GET | `/projects` | `list` (backend/src/modules/projects/projects.controller.ts) | — | unknown |
| POST | `/projects` | `create` (backend/src/modules/projects/projects.controller.ts) | body: CreateProjectDto | unknown |
| DELETE | `/projects/:id` | `delete` (backend/src/modules/projects/projects.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/projects/:id` | `update` (backend/src/modules/projects/projects.controller.ts) | params: IdParamDto, body: UpdateProjectDto | unknown |
| POST | `/projects/:id/spotlight` | `toggleSpotlight` (backend/src/modules/projects/projects.controller.ts) | params: IdParamDto | unknown |
| GET | `/recommendations/next` | `next` (backend/src/modules/recommendation/recommendation.controller.ts) | — | unknown |
| GET | `/referrals` | `list` (backend/src/modules/referrals/referrals.controller.ts) | — | unknown |
| POST | `/referrals` | `create` (backend/src/modules/referrals/referrals.controller.ts) | body: CreateReferralBodyDto | unknown |
| GET | `/reviews` | `list` (backend/src/modules/reviews/reviews.controller.ts) | — | unknown |
| POST | `/reviews` | `create` (backend/src/modules/reviews/reviews.controller.ts) | body: CreateReviewBodyDto | unknown |
| GET | `/stats/weekly-summary` | `getWeeklySummary` (backend/src/modules/stats/stats.controller.ts) | range: string | Promise<StatsWeeklySummaryDto> |
| GET | `/tasks` | `list` (backend/src/modules/tasks/tasks.controller.ts) | query: ListTasksQueryDto | unknown |
| POST | `/tasks` | `create` (backend/src/modules/tasks/tasks.controller.ts) | body: CreateTaskDto | unknown |
| DELETE | `/tasks/:id` | `delete` (backend/src/modules/tasks/tasks.controller.ts) | params: IdParamDto | unknown |
| PATCH | `/tasks/:id` | `update` (backend/src/modules/tasks/tasks.controller.ts) | params: IdParamDto, body: UpdateTaskDto | unknown |
| POST | `/tasks/bulk` | `bulk` (backend/src/modules/tasks/tasks.controller.ts) | body: BulkCreateTasksDto | unknown |
| GET | `/tasks/kpis` | `getKpis` (backend/src/modules/tasks/tasks.controller.ts) | — | unknown |
| POST | `/tasks/quick-parse` | `quickParse` (backend/src/modules/tasks/tasks.controller.ts) | body: QuickParseDto | unknown |
| POST | `/tasks/snooze/:id` | `snooze` (backend/src/modules/tasks/tasks.controller.ts) | params: IdParamDto, body: SnoozeTaskDto | unknown |

## Services

### AuthService

Source: `backend/src/modules/auth/auth.service.ts`

```ts
async register(email: string, password: string): Promise<AuthProfile>
async login(email: string, password: string): Promise<AuthTokens>
logout()
toProfile(user: { id: string; email: string; createdAt: Date }): AuthProfile
```

### BoostsService

Source: `backend/src/modules/boosts/boosts.service.ts`

```ts
async list()
async create(data: { title: string; impactScore: number })
async complete(id: string)
async reopen(id: string)
async delete(id: string)
```

### CompaniesService

Source: `backend/src/modules/companies/companies.service.ts`

```ts
async create(data: { name: string; domain?: string; linkedinUrl?: string })
async list(query?: string)
async findById(id: string)
async update(id: string, data: { name?: string; domain?: string; linkedinUrl?: string })
async findOrCreate(name: string)
```

### ContactsService

Source: `backend/src/modules/contacts/contacts.service.ts`

```ts
async list(params?: { query?: string; strength?: ContactStrength; companyId?: string; includeArchived?: boolean; page?: number; pageSize?: number; tags?: string[]; lastTouch?: '7d' | '30d' | 'stale' | 'never'; })
async create(data: { name: string; companyId?: string; companyName?: string; role?: string; email?: string; phone?: string; linkedinUrl?: string; githubUrl?: string; location?: string; tags?: string[]; notes?: string; strength?: ContactStrength; })
async getById(contactId: string)
async getEngagementSummary(contactId: string)
async update( contactId: string, data: { name?: string; companyId?: string | null; companyName?: string; role?: string | null; email?: string | null; phone?: string | null; linkedinUrl?: string | null; githubUrl?: string | null; location?: string | null; tags?: string[]; notes?: string | null; strength?: ContactStrength; } )
async delete(contactId: string, options: { hard?: boolean } = {})
async promoteStrength(contactId: string, strength: ContactStrength)
async listNetworkStars()
```

### DashboardService

Source: `backend/src/modules/dashboard/dashboard.service.ts`

```ts
async getSummary( userId?: string | null, options: { force?: boolean; range?: number } = {} ): Promise<DashboardSummaryWithMeta>
```

### EventsService

Source: `backend/src/modules/events/events.service.ts`

```ts
async list()
async create(params: CreateEventParams)
async update(id: string, params: UpdateEventParams)
async addContact(eventId: string, contactId: string, followupDueAt?: string, note?: string)
async markAttended(eventId: string, params: AttendEventParams)
```

### FollowupsService

Source: `backend/src/modules/followups/followups.service.ts`

```ts
async getDue(filter: 'today' | 'overdue' | 'upcoming' = 'today')
async scheduleInitialFollowup(context: FollowupContext)
async createFollowup( params: FollowupContext & { attemptNo: 1 | 2; dueAt: Date; type?: FollowUpType; appointmentMode?: FollowUpAppointmentMode | null; } )
async scheduleCustomFollowup(data: InferDto<typeof CreateFollowupDto>)
async updateFollowup(id: string, data: InferDto<typeof UpdateFollowupDto>)
async deleteFollowup(id: string)
async cancelOpenForContext(params: { jobId?: string; contactId?: string })
async markSent(id: string, note?: string)
async markDormantForJob(jobId: string)
```

### GrowService

Source: `backend/src/modules/grow/grow.service.ts`

```ts
async listReviews()
async createReview(dto: CreateReviewInput)
async listEvents()
async createEvent(dto: CreateEventInput)
async listBoostTasks()
async createBoostTask(dto: CreateBoostTaskInput)
async updateBoostTask(id: string, dto: UpdateBoostTaskInput)
async listProjectHighlights()
async createProjectHighlight(dto: CreateProjectHighlightInput)
async updateProjectHighlight(id: string, dto: UpdateProjectHighlightInput)
async countRecentActivity(days = 7)
async suggestBoostTasks(): Promise<BoostSuggestion[]>
```

### JobsService

Source: `backend/src/modules/jobs/jobs.service.ts`

```ts
async list( filters: { stage?: JobStage; heat?: number; includeArchived?: boolean; query?: string; page?: number; pageSize?: number; } = {} )
async getById(jobId: string)
async create(data: InferDto<typeof CreateJobDto>)
async update( jobId: string, data: { company?: string; role?: string; sourceUrl?: string | null; companyId?: string | null; } )
async delete(jobId: string, options: { hard?: boolean } = {})
async addApplication(jobId: string, dto: InferDto<typeof AddApplicationDto>)
async updateStatus(jobId: string, dto: InferDto<typeof UpdateJobStageDto>)
async recordJobOutreach(jobId: string, payload: CreateJobOutreachInput)
async addNote( jobId: string, data: InferDto<typeof CreateJobNoteDto>, userId?: string )
async updateNote( jobId: string, noteId: string, data: InferDto<typeof UpdateJobNoteDto> )
async deleteNote(jobId: string, noteId: string)
async getHistory(jobId: string)
async recalculateHeat(jobId: string)
async getHeatExplanation(jobId: string)
async getPipelineSummary()
```

### KpiService

Source: `backend/src/modules/kpi/kpi.service.ts`

```ts
async getToday()
async getWeek()
async getRollingSevenDays()
```

### NotificationsService

Source: `backend/src/modules/notifications/notifications.service.ts`

```ts
async list(filter: 'today' | 'upcoming' | 'overdue' = 'today')
async createNotification(kind: string, message: string, dueAt: Date)
async markSent(id: string)
async queueDormantCandidateCheck({ jobId, contactId, dueAt }: DormantCandidateParams)
async createDailyNudge(message: string, dueAt: Date)
async ensureNotification( kind: string, message: string, dueAt: Date, extras?: { jobId?: string; contactId?: string } )
```

### OutreachService

Source: `backend/src/modules/outreach/outreach.service.ts`

```ts
async createJobOutreach(jobId: string, payload: OutreachInput)
async createContactOutreach(contactId: string, payload: OutreachInput)
async list(filter: { jobId?: string; contactId?: string })
async update(id: string, payload: PayloadUpdate)
async delete(id: string)
async findStaleWithoutOutcome(hours = 48)
```

### PrismaService

Source: `backend/src/prisma/prisma.service.ts`

```ts
async onModuleInit()
async onModuleDestroy()
enableShutdownHooks(app: INestApplication)
```

### ProjectsService

Source: `backend/src/modules/projects/projects.service.ts`

```ts
async list()
async create(params: CreateProjectParams)
async update(id: string, params: UpdateProjectParams)
async toggleSpotlight(id: string)
async delete(id: string)
```

### RateLimitService

Source: `backend/src/common/rate-limit/rate-limit.service.ts`

```ts
hit(key: string, maxOverride?: number, windowOverride?: number): RateLimitHit
```

### RecommendationService

Source: `backend/src/modules/recommendation/recommendation.service.ts`

```ts
async getNextRecommendation()
```

### ReferralsService

Source: `backend/src/modules/referrals/referrals.service.ts`

```ts
async list()
async createForContact(contactId: string, params: CreateReferralParams)
```

### RequestContextService

Source: `backend/src/common/context/request-context.service.ts`

```ts
run(callback: () => void, seed?: Partial<RequestStore>)
setUser(user: { id: string; email?: string; username?: string })
getUserId()
getRequestId()
```

### ReviewsService

Source: `backend/src/modules/reviews/reviews.service.ts`

```ts
async list()
async createForContact(contactId: string, params: Omit<CreateReviewParams, 'contactId'>)
async create(params: CreateReviewParams)
```

### StatsService

Source: `backend/src/modules/stats/stats.service.ts`

```ts
async getWeeklySummary(rangeInput: number): Promise<StatsWeeklySummaryDto>
```

### TasksService

Source: `backend/src/modules/tasks/tasks.service.ts`

```ts
async list(query: ListTasksQuery)
async create(payload: CreateTaskInput)
async update(id: string, payload: UpdateTaskInput)
async delete(id: string)
async bulkCreate(payload: { tasks: CreateTaskInput[] })
async quickParse(payload: QuickParseInput)
async snooze(id: string, preset: SnoozePreset)
async getActionableTasks(limitPerBucket = 25)
async getKpis()
async handleOutreachAutomation(payload: OutreachAutomationInput)
```

## Prisma Models

### User

Fields:
- `id           String   @id @default(cuid())`
- `email        String   @unique`
- `passwordHash String`
- `createdAt    DateTime @default(now())`
- `updatedAt    DateTime @updatedAt`
- `companies         Company[]`
- `contacts          Contact[]`
- `jobs              Job[]`
- `tasks             Task[]`
- `growthReviews     GrowthReview[]`
- `growthEvents      GrowthEvent[]`
- `growthBoostTasks  GrowthBoostTask[]`
- `projectHighlights ProjectHighlight[]`
- `jobNotes          JobNote[]`

### Company

Fields:
- `id          String   @id @default(cuid())`
- `name        String`
- `domain      String?`
- `linkedinUrl String?`
- `createdAt   DateTime @default(now())`
- `updatedAt   DateTime @updatedAt`
- `contacts Contact[]`
- `jobs     Job[]`
- `userId String?`
- `user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([name])`
- `@@index([userId])`

Relations:
- user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### Job

Fields:
- `id          String    @id @default(cuid())`
- `company     String`
- `companyId   String?`
- `companyRef  Company?  @relation(fields: [companyId], references: [id])`
- `role        String`
- `sourceUrl   String?`
- `heat        Int`
- `deadline    DateTime?`
- `stage       JobStage  @default(APPLIED)`
- `lastTouchAt DateTime  @default(now())`
- `createdAt   DateTime  @default(now())`
- `updatedAt   DateTime  @updatedAt`
- `archived    Boolean   @default(false)`
- `archivedAt  DateTime?`
- `applications  JobApplication[]`
- `statusHistory JobStatusHistory[]`
- `outreaches    Outreach[]`
- `followups     FollowUp[]`
- `referrals     Referral[]`
- `notifications Notification[]`
- `notes         JobNote[]`
- `userId String?`
- `user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([heat, updatedAt])`
- `@@index([deadline])`
- `@@index([companyId])`
- `@@index([archived])`
- `@@index([userId])`

Relations:
- companyRef  Company?  @relation(fields: [companyId], references: [id])
- user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### JobApplication

Fields:
- `id             String   @id @default(cuid())`
- `jobId          String`
- `job            Job      @relation(fields: [jobId], references: [id])`
- `dateSent       DateTime`
- `tailoringScore Int`
- `cvVersionId    String?`

Relations:
- job            Job      @relation(fields: [jobId], references: [id])

### JobStatusHistory

Fields:
- `id    String   @id @default(cuid())`
- `jobId String`
- `job   Job      @relation(fields: [jobId], references: [id])`
- `stage JobStage`
- `at    DateTime @default(now())`
- `note  String?`

Relations:
- job   Job      @relation(fields: [jobId], references: [id])

### JobNote

Fields:
- `id        String   @id @default(cuid())`
- `jobId     String`
- `job       Job      @relation(fields: [jobId], references: [id])`
- `content   String`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- `userId    String?`
- `user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([jobId])`
- `@@index([userId])`

Relations:
- job       Job      @relation(fields: [jobId], references: [id])
- user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### Contact

Fields:
- `id          String          @id @default(cuid())`
- `name        String`
- `companyId   String?`
- `company     Company?        @relation(fields: [companyId], references: [id])`
- `role        String?`
- `strength    ContactStrength @default(WEAK)`
- `email       String?`
- `phone       String?`
- `linkedinUrl String?`
- `githubUrl   String?`
- `location    String?`
- `tags        String[]        @default([])`
- `notes       String?`
- `archived    Boolean         @default(false)`
- `archivedAt  DateTime?`
- `createdAt   DateTime        @default(now())`
- `updatedAt   DateTime        @updatedAt`
- `outreaches    Outreach[]`
- `referrals     Referral[]`
- `reviews       CodeReview[]`
- `eventLinks    EventContact[]`
- `followups     FollowUp[]`
- `notifications Notification[]`
- `GrowthReview  GrowthReview[]`
- `userId String?`
- `user   User?          @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([strength])`
- `@@index([companyId])`
- `@@index([name])`
- `@@index([userId])`

Relations:
- company     Company?        @relation(fields: [companyId], references: [id])
- user   User?          @relation(fields: [userId], references: [id], onDelete: SetNull)

### Outreach

Fields:
- `id                   String          @id @default(cuid())`
- `jobId                String?`
- `job                  Job?            @relation(fields: [jobId], references: [id])`
- `contactId            String?`
- `contact              Contact?        @relation(fields: [contactId], references: [id])`
- `channel              OutreachChannel`
- `messageType          String`
- `personalizationScore Int`
- `outcome              OutreachOutcome @default(NONE)`
- `content              String?`
- `context              OutreachContext @default(OTHER)`
- `sentAt               DateTime        @default(now())`

Relations:
- job                  Job?            @relation(fields: [jobId], references: [id])
- contact              Contact?        @relation(fields: [contactId], references: [id])

### FollowUp

Fields:
- `id        String    @id @default(cuid())`
- `jobId     String?`
- `job       Job?      @relation(fields: [jobId], references: [id])`
- `contactId String?`
- `contact   Contact?  @relation(fields: [contactId], references: [id])`
- `dueAt     DateTime`
- `sentAt    DateTime?`
- `attemptNo Int`
- `note      String?`
- `type      FollowUpType     @default(STANDARD)`
- `appointmentMode FollowUpAppointmentMode?`
- `tasks     Task[]`
- `@@index([dueAt])`

Relations:
- job       Job?      @relation(fields: [jobId], references: [id])
- contact   Contact?  @relation(fields: [contactId], references: [id])

### Referral

Fields:
- `id        String       @id @default(cuid())`
- `contactId String`
- `contact   Contact      @relation(fields: [contactId], references: [id])`
- `jobId     String?`
- `job       Job?         @relation(fields: [jobId], references: [id])`
- `kind      ReferralKind`
- `at        DateTime     @default(now())`
- `note      String?`

Relations:
- contact   Contact      @relation(fields: [contactId], references: [id])
- job       Job?         @relation(fields: [jobId], references: [id])

### Project

Fields:
- `id        String   @id @default(cuid())`
- `name      String`
- `repoUrl   String`
- `stack     String?`
- `spotlight Boolean  @default(false)`
- `createdAt DateTime @default(now())`
- `reviews CodeReview[]`

### CodeReview

Fields:
- `id           String    @id @default(cuid())`
- `projectId    String`
- `project      Project   @relation(fields: [projectId], references: [id])`
- `contactId    String`
- `contact      Contact   @relation(fields: [contactId], references: [id])`
- `requestedAt  DateTime  @default(now())`
- `reviewedAt   DateTime?`
- `summary      String?`
- `qualityScore Int?`

Relations:
- project      Project   @relation(fields: [projectId], references: [id])
- contact      Contact   @relation(fields: [contactId], references: [id])

### Event

Fields:
- `id                      String      @id @default(cuid())`
- `name                    String`
- `date                    DateTime`
- `location                String?`
- `topic                   String?`
- `status                  EventStatus @default(PLANNED)`
- `targetsMinConversations Int?`
- `eventContacts EventContact[]`

### EventContact

Fields:
- `id            String    @id @default(cuid())`
- `eventId       String`
- `event         Event     @relation(fields: [eventId], references: [id])`
- `contactId     String`
- `contact       Contact   @relation(fields: [contactId], references: [id])`
- `followupDueAt DateTime?`

Relations:
- event         Event     @relation(fields: [eventId], references: [id])
- contact       Contact   @relation(fields: [contactId], references: [id])

### BoostTask

Fields:
- `id          String    @id @default(cuid())`
- `title       String`
- `impactScore Int`
- `createdAt   DateTime  @default(now())`
- `doneAt      DateTime?`

### MetricSnapshot

Fields:
- `id      String   @id @default(cuid())`
- `date    DateTime @default(now())`
- `kpiName String`
- `value   Int`

### Recommendation

Fields:
- `id         String    @id @default(cuid())`
- `createdAt  DateTime  @default(now())`
- `kind       String`
- `payload    Json`
- `resolvedAt DateTime?`

### Notification

Fields:
- `id        String    @id @default(cuid())`
- `kind      String`
- `message   String`
- `dueAt     DateTime`
- `sentAt    DateTime?`
- `jobId     String?`
- `contactId String?`
- `job       Job?      @relation(fields: [jobId], references: [id])`
- `contact   Contact?  @relation(fields: [contactId], references: [id])`

Relations:
- job       Job?      @relation(fields: [jobId], references: [id])
- contact   Contact?  @relation(fields: [contactId], references: [id])

### GrowthReview

Fields:
- `id          String   @id @default(cuid())`
- `reviewerId  String`
- `projectName String`
- `summary     String`
- `score       Int`
- `reviewedAt  DateTime @default(now())`
- `takeaways   String?`
- `contact Contact @relation(fields: [reviewerId], references: [id])`
- `userId  String?`
- `user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([userId])`

Relations:
- contact Contact @relation(fields: [reviewerId], references: [id])
- user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### GrowthEvent

Fields:
- `id        String   @id @default(cuid())`
- `name      String`
- `date      DateTime`
- `location  String?`
- `attended  Boolean  @default(false)`
- `notes     String?`
- `followUps String[] @default([])`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- `userId String?`
- `user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([userId])`

Relations:
- user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### GrowthBoostTask

Fields:
- `id          String    @id @default(cuid())`
- `title       String`
- `description String?`
- `category    String`
- `impactLevel Int`
- `tags        String[]  @default([])`
- `status      String    @default("pending")`
- `createdAt   DateTime  @default(now())`
- `updatedAt   DateTime  @updatedAt`
- `completedAt DateTime?`
- `userId String?`
- `user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([userId])`

Relations:
- user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### ProjectHighlight

Fields:
- `id          String    @id @default(cuid())`
- `projectName String`
- `platformUrl String?`
- `spotlight   Boolean   @default(false)`
- `plannedPost String?`
- `published   Boolean   @default(false)`
- `publishedAt DateTime?`
- `createdAt   DateTime  @default(now())`
- `updatedAt   DateTime  @updatedAt`
- `userId String?`
- `user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `@@index([userId])`

Relations:
- user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

### Task

Fields:
- `id          String   @id @default(cuid())`
- `title       String`
- `description String?`
- `status      String   @default("Todo")`
- `priority    String   @default("Med")`
- `tags        String[] @default([])`
- `dueAt       DateTime?`
- `startAt     DateTime?`
- `recurrence  String?`
- `source      String   @default("Manual")`
- `links       Json?`
- `checklist   Json?`
- `createdAt   DateTime @default(now())`
- `completedAt DateTime?`
- `userId      String?`
- `user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)`
- `followUpId  String?  @unique`
- `followUp    FollowUp? @relation(fields: [followUpId], references: [id], onDelete: Cascade)`
- `@@index([dueAt])`
- `@@index([status])`
- `@@index([userId])`

Relations:
- user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
- followUp    FollowUp? @relation(fields: [followUpId], references: [id], onDelete: Cascade)

## Prisma Enums

### JobStage

- `APPLIED`
- `HR`
- `TECH`
- `OFFER`
- `REJECTED`
- `DORMANT`

### ContactStrength

- `WEAK`
- `MEDIUM`
- `STRONG`

### OutreachChannel

- `LINKEDIN`
- `EMAIL`
- `PHONE`
- `OTHER`

### OutreachOutcome

- `NONE`
- `POSITIVE`
- `NEGATIVE`
- `NO_RESPONSE`

### OutreachContext

- `JOB_OPPORTUNITY`
- `CODE_REVIEW`
- `CHECK_IN`
- `REFERRAL_REQUEST`
- `OTHER`

### ReferralKind

- `INTRO`
- `REFERRAL`
- `SENT_CV`

### FollowUpType

- `STANDARD`
- `APPOINTMENT`

### FollowUpAppointmentMode

- `MEETING`
- `ZOOM`
- `PHONE`
- `ON_SITE`
- `OTHER`

### EventStatus

- `PLANNED`
- `ATTENDED`
