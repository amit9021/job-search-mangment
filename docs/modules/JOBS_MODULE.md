# Jobs Module - Full Documentation

## 📋 **Table of Contents**
- [Overview](#overview)
- [Database Schema](#database-schema)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [API Reference](#api-reference)
- [Component Reference](#component-reference)
- [User Flows](#user-flows)
- [Business Logic](#business-logic)
- [Development Guide](#development-guide)

---

## 🎯 **Overview**

The Jobs module is the core of the job hunt tracking system. It manages job applications, tracks their progress through various stages, and coordinates with other modules (contacts, outreach, referrals).

### **Key Features**
- Track job applications from discovery to offer
- Multi-stage pipeline (Applied → HR → Tech → Offer → Rejected/Dormant)
- Heat scoring (0-3) based on referral strength and outreach responses
- CV tailoring score tracking
- Status history timeline
- Deadline management
- Integration with outreach and referrals

### **Why This Matters**
Job hunting is a numbers game with high stakes. This module helps you:
- Never lose track of an application
- Know which jobs need immediate attention (heat)
- See complete history of each application
- Measure CV quality (tailoring scores)
- Connect applications to network contacts

---

## 🗄️ **Database Schema**

### **Job Model**
```prisma
model Job {
  id          String    @id @default(cuid())
  company     String                       // Company name (string)
  companyId   String?                      // Optional FK to Company (NEW)
  companyRef  Company?  @relation(fields: [companyId], references: [id])
  role        String
  sourceUrl   String?                      // Job posting URL
  stage       JobStage  @default(APPLIED)
  heat        Int       @default(0)        // 0-3 relationship score
  deadline    DateTime?
  archived    Boolean   @default(false)    // Soft delete flag
  archivedAt  DateTime?
  lastTouchAt DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  statusHistory JobStatusHistory[]
  applications  JobApplication[]
  outreach      Outreach[]
  referrals     Referral[]
  followups     FollowUp[]

  @@index([stage])
  @@index([heat])
  @@index([updatedAt])
  @@index([archived])
}

enum JobStage {
  APPLIED       // CV sent, awaiting initial response
  HR            // HR/recruiter screen stage
  TECH          // Technical interviews stage
  OFFER         // Offer received
  REJECTED      // Application rejected at any stage
  DORMANT       // Job inactive/archived (offer accepted or withdrawn)
}
```

### **JobApplication Model**
```prisma
model JobApplication {
  id              String    @id @default(cuid())
  jobId           String
  job             Job       @relation(fields: [jobId], references: [id])
  dateSent        DateTime  @default(now())
  tailoringScore  Int                        // 0-100 (how well CV matches job)
  cvVersionId     String?                    // Which CV version used
  createdAt       DateTime  @default(now())

  @@index([jobId])
}
```

### **JobStatusHistory Model**
```prisma
model JobStatusHistory {
  id        String   @id @default(cuid())
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id])
  stage     JobStage
  note      String?
  timestamp DateTime @default(now())

  @@index([jobId])
  @@index([timestamp])
}
```

### **Heat Scoring System**
```
0 = Cold      - No referral or outreach responses yet
1 = Warm      - Any outreach response (positive/negative) or positive reply from a weak contact
2 = Hot       - Positive outreach from a MEDIUM/STRONG contact
3 = Critical  - Referral recorded (REFERRAL or SENT_CV)
```

Heat auto-recalculates based on referral strength and outreach outcomes. Archived jobs are always cooled to 0.
- Falls back to cold (0) when no signals are present

---

## 🔧 **Backend Architecture**

### **Module Structure**
```
backend/src/modules/jobs/
├── jobs.module.ts              # Module registration
├── jobs.controller.ts          # HTTP endpoints
├── jobs.service.ts             # Business logic
└── dto/
    ├── create-job.dto.ts       # Validation for POST
    ├── add-application.dto.ts  # CV submission
    ├── update-job-stage.dto.ts # Status changes
    └── index.ts                # Barrel exports
```

### **JobsService** (`jobs.service.ts`)

#### **Dependencies**
```typescript
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followupsService: FollowupsService,
    private readonly outreachService: OutreachService
  ) {}
}
```

#### **Methods**

**1. list(stage?, heat?)**
```typescript
async list(stage?: JobStage, heat?: number)
```
- **Filters**: Optional by stage and/or heat level
- **Ordering**: Most recently updated first
- **Returns**: Array of jobs with basic info

**2. create(data)**
```typescript
async create(data: {
  company: string;
  role: string;
  sourceUrl?: string;
  deadline?: string;
  heat?: number;
  initialApplication?: {
    tailoringScore: number;
    cvVersionId?: string;
    dateSent?: string;
  };
  initialOutreach?: {
    contactId?: string;
    channel: string;
    messageType: string;
    personalizationScore: number;
    content?: string;
  };
})
```
- **Auto-creates**: JobStatusHistory entry (stage: APPLIED)
- **Optional**: Creates JobApplication if `initialApplication` provided
- **Optional**: Creates Outreach if `initialOutreach` provided
- **Default Stage**: APPLIED
- **Default Heat**: 0 (or provided value)

**3. addApplication(jobId, data)**
```typescript
async addApplication(jobId: string, data: {
  dateSent: string;
  tailoringScore: number;
  cvVersionId?: string;
})
```
- **Creates**: JobApplication record
- **Side Effects**:
  - Updates `job.lastTouchAt`
  - Recalculates heat based on application count
  - Can trigger follow-up creation (if configured)

**4. updateStatus(jobId, data)**
```typescript
async updateStatus(jobId: string, data: {
  stage: JobStage;
  note?: string;
})
```
- **Updates**: Job stage
- **Creates**: JobStatusHistory entry
- **Updates**: `lastTouchAt` and `updatedAt`
- **Side Effect**: Recalculates heat

**5. addOutreach(jobId, data)**
```typescript
async addOutreach(jobId: string, data: {
  contactId?: string;
  channel: OutreachChannel;
  messageType: string;
  personalizationScore: number;
  outcome?: OutreachOutcome;
  content?: string;
})
```
- **Creates**: Outreach record linked to job
- **Updates**: `job.lastTouchAt`
- **Side Effect**: May promote contact strength if outcome is POSITIVE

**6. getHistory(jobId)**
```typescript
async getHistory(jobId: string)
```
- **Returns**: Array of JobStatusHistory entries
- **Ordered**: Chronological (oldest to newest)
- **Use Case**: Display timeline in UI

**7. recalculateHeat(jobId)** (Private)
```typescript
private async recalculateHeat(jobId: string)
```
- **Algorithm** (relationship-first):
  1. If there is a referral with kind `REFERRAL` or `SENT_CV` → heat = 3 (critical)
  2. Else if a POSITIVE outreach exists from a MEDIUM/STRONG contact → heat = 2 (hot)
  3. Else if any POSITIVE outreach exists (WEAK contact) → heat = 1 (warm)
  4. Else if any outreach has POSITIVE/NEGATIVE outcome → heat = 1 (response received)
  5. Otherwise → heat = 0 (cold)
- **Additional rule**: Archived jobs are forced to heat 0
- **Auto-updates**: Job record with new heat value

---

### **JobsController** (`jobs.controller.ts`)

```typescript
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async list(@Query() query: { stage?: JobStage; heat?: number })

  @Post()
  async create(@Body() body: CreateJobDto)

  @Post(':id/applications')
  async addApplication(@Param() params: IdParamDto, @Body() body: AddApplicationDto)

  @Post(':id/status')
  async updateStatus(@Param() params: IdParamDto, @Body() body: UpdateJobStageDto)

  @Post(':id/outreach')
  async addOutreach(@Param() params: IdParamDto, @Body() body: CreateJobOutreachDto)

  @Get(':id/history')
  async getHistory(@Param() params: IdParamDto)
}
```

---

## 🎨 **Frontend Architecture**

### **Component Structure**
```
frontend/src/
├── pages/
│   ├── JobsPage.tsx            # Pipeline + table toggle (Link Contact entry point)
│   └── DashboardPage.tsx       # Shows heat breakdown
├── components/
│   ├── JobWizardModal.tsx      # Create job with CV + outreach (inline contact creation)
│   ├── JobHistoryModal.tsx     # Timeline + stage updates via dialog
│   ├── JobListTable.tsx        # Tabular view (stage inline edit, contacts column)
│   ├── LinkContactDialog.tsx   # Link job → contact via outreach
│   ├── LinkJobDialog.tsx       # Link contact → job via outreach (supports inline job create)
│   ├── UpdateJobStageDialog.tsx# Stage change modal collecting notes
│   └── HeatBadge.tsx           # Visual heat indicator (0-3)
└── api/
    └── hooks.ts                # React Query hooks
```

### **State Management**

#### **React Query Hooks**
```typescript
// List jobs with filters + search + pagination
useJobsQuery(filters?: {
  stage?: string;
  heat?: number;
  includeArchived?: boolean;
  query?: string;
  page?: number;
  pageSize?: number;
})

// Mutations
useCreateJobMutation();
useCreateJobOutreachMutation();
useUpdateJobStageMutation();
```

#### **Local State** (JobsPage)
```typescript
const [stageFilter, setStageFilter] = useState<JobStage | undefined>();
const [heatFilter, setHeatFilter] = useState<number | undefined>();
const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
const [linkJob, setLinkJob] = useState<JobSummary | null>(null); // opens LinkContactDialog
const [stageJob, setStageJob] = useState<JobSummary | null>(null); // opens UpdateJobStageDialog
```

---

## 📡 **API Reference**

### **Base URL**: `http://localhost:3001`

### **Endpoints**

#### **GET /jobs**
List jobs with optional filters.

**Query Parameters**:
```typescript
{
  stage?: 'APPLIED' | 'HR' | 'TECH' | 'OFFER' | 'REJECTED' | 'DORMANT';
  heat?: 0 | 1 | 2 | 3;
  includeArchived?: boolean; // defaults to false
  query?: string;            // fuzzy match on company/role
  page?: number;             // optional pagination (1-indexed)
  pageSize?: number;         // optional page size (<=200)
}
```

**Response**:
```json
[
  {
    "id": "cm...",
    "company": "TechCorp",
    "role": "Senior Engineer",
    "stage": "TECH",
    "heat": 2,
    "sourceUrl": "https://techcorp.com/careers/senior-engineer",
    "deadline": "2025-11-15T00:00:00.000Z",
    "lastTouchAt": "2025-10-28T10:00:00.000Z",
    "createdAt": "2025-10-20T08:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z",
    "archived": false,
    "archivedAt": null,
    "contactsCount": 2,
    "nextFollowUpAt": "2025-10-31T09:00:00.000Z"
  }
]
```

---

#### **POST /jobs**
Create new job application.

**Request Body**:
```json
{
  "company": "StartupXYZ",
  "role": "Full Stack Engineer",
  "sourceUrl": "https://startupxyz.com/jobs/fullstack",
  "deadline": "2025-11-30T00:00:00.000Z",
  "initialApplication": {
    "tailoringScore": 85,
    "dateSent": "2025-10-30T10:00:00.000Z"
  },
  "initialOutreach": {
    "contactId": "cm...",
    "channel": "EMAIL",
    "messageType": "intro_request",
    "personalizationScore": 90,
    "content": "Hi John, saw you work at StartupXYZ...",
    "createFollowUp": true,
    "followUpNote": "Ping again in 3 days"
  }
}
```

**Response**: Created job object

> **Note:** Provide either `contactId` (existing contact cuid) or `contactCreate` with `{ name, role?, email?, linkedinUrl?, companyName? }`. `createFollowUp` defaults to `true`, and `followUpNote` seeds the follow-up task.

**Business Logic**:
1. Creates Job with stage=APPLIED
2. Creates JobStatusHistory entry
3. If `initialApplication` provided → creates JobApplication
4. If `initialOutreach` provided → creates Outreach record (and optional follow-up)
5. Heat recalculated using referral/outreach rules (see below)

---

#### **POST /jobs/:id/applications**
Submit CV for existing job.

**Request Body**:
```json
{
  "dateSent": "2025-10-30T10:00:00.000Z",
  "tailoringScore": 92,
  "cvVersionId": "cm..."
}
```

**Side Effects**:
- Updates `job.lastTouchAt`
- Recalculates heat (application count affects heat)
- May create follow-up reminder

---

#### **POST /jobs/:id/status**
Update job stage.

**Request Body**:
```json
{
  "stage": "TECH",
  "note": "Scheduled for Nov 5th, 2pm - 3 rounds"
}
```

**Side Effects**:
- Creates JobStatusHistory entry
- Updates `job.lastTouchAt` and `updatedAt`
- Recalculates heat (TECH → heat >= 2, OFFER → heat = 3)

**Response**:
```json
{
  "job": {
    "id": "job_1",
    "company": "TechCorp",
    "stage": "TECH",
    "heat": 2,
    "contactsCount": 2,
    "nextFollowUpAt": "2025-11-01T09:00:00.000Z"
  },
  "history": {
    "id": "hist_123",
    "stage": "TECH",
    "note": "Scheduled two technical rounds",
    "at": "2025-10-30T15:30:00.000Z"
  }
}
```

---

#### **POST /jobs/:id/outreach**
Log outreach attempt for job.

**Request Body**:
```json
{
  "contactId": "cm...",
  "channel": "LINKEDIN",
  "messageType": "follow_up",
  "personalizationScore": 75,
  "outcome": "POSITIVE",
  "content": "Thanks for connecting! Would love to chat about...",
  "createFollowUp": true,
  "followUpNote": "Remind on Tuesday"
}

// or inline contact creation
{
  "contactCreate": {
    "name": "Jamie Recruiter",
    "role": "Talent Partner",
    "email": "jamie@example.com",
    "companyName": "Globex"
  },
  "channel": "EMAIL",
  "messageType": "intro_request",
  "personalizationScore": 80
}
```

**Side Effects**:
- Creates Outreach record and optional follow-up (3-day default)
- Updates `job.lastTouchAt`
- Auto-creates contact when `contactCreate` provided (re-uses CompaniesService findOrCreate)
- If outcome=POSITIVE → may promote contact strength

**Response**:
```json
{
  "outreach": {
    "id": "out_123",
    "jobId": "job_1",
    "contactId": "contact_1",
    "channel": "EMAIL",
    "messageType": "intro_request",
    "personalizationScore": 80,
    "sentAt": "2025-10-30T12:00:00.000Z",
    "contact": { "id": "contact_1", "name": "Jamie Recruiter" }
  },
  "job": {
    "id": "job_1",
    "company": "Globex",
    "stage": "APPLIED",
    "contactsCount": 2,
    "nextFollowUpAt": "2025-11-02T12:00:00.000Z"
  }
}
```
> **Tip:** Either `contactId` or `contactCreate` must be provided. `personalizationScore` defaults to 70 if omitted.

---

#### **PATCH /jobs/:id**
Update core job details (company, role, URL, deadline, linked company).

**Request Body** (any subset):
```json
{
  "company": "Acme Inc",
  "role": "Staff SWE",
  "sourceUrl": "https://acme.com/careers/staff-swe",
  "deadline": "2025-12-01T00:00:00.000Z",
  "companyId": "ck..."
}
```

**Side Effects**:
- Normalizes empty strings to `null`
- Re-parses ISO deadlines
- Touches `updatedAt`

---

#### **DELETE /jobs/:id**
Archive or hard-delete a job.

**Query Parameters**:
- `hard=true` → remove the job and all related data (child rows + follow-ups).
- _absent/false_ → soft delete (sets `stage=DORMANT`, `archived=true`, retains history).

**Responses**:
- Soft delete: `{ "success": true, "archived": true }`
- Hard delete: `{ "success": true, "hardDeleted": true }`
- On FK violation (hard delete): HTTP 409 with descriptive message.

**Side Effects**:
- Soft delete marks outstanding follow-ups dormant and recalculates heat to 0.
- Hard delete cascades through applications, outreaches, history, follow-ups, notifications, and detaches referrals.

---

#### **GET /jobs/:id/history**
Get status change timeline.

**Response**:
```json
[
  {
    "id": "cm...",
    "stage": "APPLIED",
    "note": "Job created",
    "timestamp": "2025-10-20T08:00:00.000Z"
  },
  {
    "id": "cm...",
    "stage": "HR",
    "note": "Recruiter call scheduled for Oct 25",
    "timestamp": "2025-10-22T14:00:00.000Z"
  },
  {
    "id": "cm...",
    "stage": "TECH",
    "note": "Scheduled for Nov 5th, 2pm - 3 rounds",
    "timestamp": "2025-10-28T10:00:00.000Z"
  }
]
```

---

## 🧩 **Component Reference**

### **JobsPage**
**Location**: `frontend/src/pages/JobsPage.tsx`

**Purpose**: Main jobs listing (table or kanban view).

**Features**:
- Toggle between kanban pipeline and analytical table view.
- Stage filters (Applied/HR/Tech/Offer plus archived toggle) and heat chips (0–3).
- Pipeline cards show heat, last touch, and linked contact chips (clickable to open the Contact drawer).
- Table columns: Company • Role • Stage (inline selector) • Heat • Contacts (chips + count) • Last touch • Next follow-up • Deadline • Source • Actions.
- Row actions: Edit, History, Link contact, Delete (soft/hard).
- `Link contact` button opens the two-tab dialog for selecting or creating contacts and logging outreach in one flow.

**Props**: None (route component)

---

### **JobWizardModal**
**Location**: `frontend/src/components/JobWizardModal.tsx`

**Purpose**: Create new job with optional CV submission and outreach.

**Features**:
- **Step 1**: Job details (company, role, URL, deadline)
- **Step 2**: CV submission (tailoring score)
- **Step 3**: Optional outreach (contact, channel, message, purpose)
  - Validation (Zod + react-hook-form)
  - Multi-step form with progressive disclosure
- Contact picker supports typeahead search for existing contacts, inline creation with supplementary fields (email/role/LinkedIn), and keeps primary actions anchored in a sticky footer.
- Outreach metadata now captures a “Purpose” (job opportunity, code review, check-in, referral, or other) and defaults to `JOB_OPPORTUNITY` for wizard-created outreach.

**Props**: None (self-contained modal)

**Usage**:
```tsx
<JobWizardModal />
// Opens via internal state (button in header/dashboard)
```

---

### **HeatBadge**
**Location**: `frontend/src/components/HeatBadge.tsx`

**Purpose**: Visual indicator of job urgency.

**Props**:
```typescript
{
  heat: 0 | 1 | 2 | 3;
}
```

**Styling**:
- 0: Gray (cold)
- 1: Yellow (warm)
- 2: Orange (hot)
- 3: Red (critical)

---

## 🔄 **User Flows**

### **Flow 1: Create Job with CV + Outreach**
1. User clicks "Add Job" button (opens JobWizardModal)
2. **Step 1**: Enters company, role, deadline
   - Optionally pastes job URL
3. **Step 2**: Enters tailoring score (0-100)
   - Indicates how well CV matches job description
4. **Step 3**: Optional outreach
   - Provide contact (paste existing Contact ID or type a new name — optional email/LinkedIn/role inputs appear for new contacts)
   - Choose channel (Email/LinkedIn/etc.)
   - Enter personalization score
   - Add message content / follow-up note
5. Clicks "Create Job"
6. Backend:
   - Creates Job (stage=APPLIED, heat calculated from deadline)
   - Creates JobStatusHistory (stage=APPLIED, note="Job created")
   - Creates JobApplication (with tailoring score)
   - Creates Outreach (if step 3 filled)
   - Updates `job.lastTouchAt`
7. Modal closes, jobs table refreshes

---

### **Flow 2: Update Job Stage**
1. User hovers a pipeline card or table row and clicks the inline stage chip (or "Update stage" inside the history modal).
2. Stage picker opens with options (Applied/HR/Tech/Offer/Rejected/Dormant) and an optional note field.
3. User confirms the change; note is logged alongside the status update.
4. Backend:
   - Updates `job.stage`
   - Creates JobStatusHistory entry (persisting the optional note)
   - Recalculates heat (TECH → heat >= 2)
   - Updates `lastTouchAt` and `updatedAt`
7. UI refreshes, job shows new stage and heat

---

### **Flow 3: Heat Auto-Calculation**
**Triggered By**:
- Job creation with deadline
- Deadline update
- Status change
- Application submission
- Outreach logged

**Algorithm**:
```
IF job has referral with kind in (REFERRAL, SENT_CV):
  heat = 3
ELSE IF job has outreach outcome = POSITIVE AND contact strength in (MEDIUM, STRONG):
  heat = 2
ELSE IF job has outreach outcome = POSITIVE:
  heat = 1
ELSE IF job has outreach outcome in (POSITIVE, NEGATIVE):
  heat = 1
ELSE:
  heat = 0

IF job.archived = true:
  heat = 0
```

---

### **Flow 4: View Job History**
1. User opens History from a pipeline card/table row.
2. Frontend calls `GET /jobs/:id/history` and renders the modal header (company + role) plus linked contact chips.
3. Chips are clickable; selecting one opens the relevant Contact drawer for deeper context.
4. Backend returns status history, applications, outreach (with contact info), and follow-ups.
5. UI timeline merges these entries chronologically, showing stage notes, outreach channel/type/personalization/purpose, and follow-up status (including which contact needs attention).
6. Close modal or jump to `Update stage` from the modal toolbar; changes refresh the timeline instantly.

---

### **Flow 6: Inspect Linked Contacts**
1. Pipeline cards and the Jobs table render chips for each linked contact (based on outreach history).
2. Clicking a chip opens the Contact drawer for that person, showing full details and timeline.
3. The Link Contact dialog automatically opens the contact drawer after a successful link so the user can verify the new association.

---

### **Flow 5: Archive vs Hard Delete**
1. User opens job actions and chooses **Delete**.
2. UI prompts for *Archive* (soft) or *Delete permanently* (hard).
3. Soft delete:
   - Backend transitions stage → DORMANT, sets `archived=true`, stamps `archivedAt`.
   - Outstanding follow-ups marked dormant; heat recalculates to 0.
   - Job is hidden from default listings (unless `includeArchived=true`).
4. Hard delete:
   - Backend removes dependent rows (applications, outreach, history, follow-ups, notifications) inside a transaction.
   - Referrals referencing the job are detached.
5. UI refreshes pipeline and displays toast feedback.

---

### **Flow 6: Link Contact from Jobs (Outreach)**
1. User clicks `Link contact` on job card or table row (JobsPage).
2. `LinkContactDialog` opens with tabs:
   - **Select existing**: type-ahead search (`/contacts?query=`) shows name/role/company; selecting preview highlights "Linking to" banner.
   - **Create new**: lightweight form (name required, other fields optional, company prefilled from job).
3. After choosing contact, user fills outreach mini-form (channel, message type, purpose badge, personalization score tooltip, optional note).
4. Submits → `POST /jobs/:id/outreach` with either `contactId` or `contactCreate`.
5. Backend logs outreach, auto-schedules follow-up (unless disabled), recomputes heat/contact count.
6. UI toasts success, closes the dialog, refreshes Jobs list + job history, and immediately opens the linked Contact drawer so the user can verify the connection. The contact timeline picks up the new outreach via standard query invalidation.

---

### **Flow 7: Link Job from Contacts (Outreach + Inline Job)**
1. Inside `ContactDrawer`, user presses `Link to job`.
2. `LinkJobDialog` opens with tabs:
   - **Select job**: search `/jobs?query=` (filters archived) to attach outreach to existing job.
   - **Create job**: minimal job form (company, role required; optional URL/deadline) that reuses `POST /jobs` under the hood before logging outreach.
3. After job is selected/created, the same outreach mini-form is shown (contact is pre-wired) with channel, message type, purpose, personalization, and notes.
4. Submits → `POST /jobs/:jobId/outreach` (if new job created in step 2, dialog waits for createJob mutation to resolve).
5. Backend logs outreach, returns updated job summary; UI invalidates contact detail, jobs list, and job history to sync counts & timelines.

---

## 🧠 **Business Logic**

### **Heat Recalculation Rules**

Heat focuses on relationship strength rather than deadlines:

1. **Referral priority (heat = 3)** – If any referral of kind `REFERRAL` or `SENT_CV` exists for the job.
2. **Warm outreach (heat = 2)** – Positive outreach tied to a MEDIUM/STRONG contact.
3. **Positive reply (heat = 1)** – Positive outreach from a WEAK contact.
4. **Any response (heat = 1)** – Any outreach with a POSITIVE or NEGATIVE outcome.
5. **Default (heat = 0)** – No referral or outreach responses.

Archived jobs are automatically cooled to heat 0 regardless of previous signals.

---

### **Automatic Follow-Up Creation**

**Trigger**: Job stage changes to specific values

**Rules**:
- **HR** → Create follow-up for 3 days later ("Check in after screen")
- **TECH** → Create follow-up for 1 day after interview date ("Send thank you note")

**Implementation**: `followupsService.createForJob(jobId, dueAt, note)`

---

### **Contact Strength Promotion**

**Trigger**: Outreach outcome = POSITIVE

**Logic**:
```typescript
if (outcome === OutreachOutcome.POSITIVE && contactId) {
  await contactsService.promoteStrength(contactId, ContactStrength.MEDIUM);
}
```

**Effect**: Contact who responds positively gets promoted (WEAK → MEDIUM, MEDIUM → STRONG)

---

## 🛠️ **Development Guide**

### **Adding New Job Stage**

#### 1. Update Prisma Enum
```prisma
enum JobStage {
  APPLIED
  HR
  TECH
  TECHNICAL_TEST  // NEW STAGE
  OFFER
  REJECTED
  DORMANT
}
```

#### 2. Run Migration
```bash
cd backend
npx prisma migrate dev --name add_technical_test_stage
```

#### 3. Update DTOs
```typescript
// update-job-stage.dto.ts
import { JobStage } from '@prisma/client';

const schema = z.object({
  stage: z.nativeEnum(JobStage),  // Auto-includes new enum value
  note: z.string().optional()
});
```

#### 4. Update Frontend
```typescript
// frontend - JobsPage.tsx or wherever stages are displayed
const stages = [
  'APPLIED',
  'HR',
  'TECHNICAL_TEST',  // NEW
  'TECH',
  'OFFER',
  'REJECTED',
  'DORMANT'
];
```

---

### **Customizing Heat Algorithm**

**File**: `backend/src/modules/jobs/jobs.service.ts`

**Method**: `private async recalculateHeat(jobId: string)`

**Example**: Add boost for jobs at specific companies
```typescript
private async recalculateHeat(jobId: string) {
  const referral = await this.prisma.referral.findFirst({
    where: {
      jobId,
      kind: { in: [ReferralKind.REFERRAL, ReferralKind.SENT_CV] }
    }
  });
  if (referral) {
    await this.setHeat(jobId, 3);
    return;
  }

  const warmOutreach = await this.prisma.outreach.findFirst({
    where: { jobId, outcome: OutreachOutcome.POSITIVE },
    include: { contact: true }
  });
  if (warmOutreach?.contact) {
    const level = warmOutreach.contact.strength;
    await this.setHeat(jobId, level === 'STRONG' || level === 'MEDIUM' ? 2 : 1);
    return;
  }

  const anyResponse = await this.prisma.outreach.count({
    where: {
      jobId,
      outcome: { in: [OutreachOutcome.POSITIVE, OutreachOutcome.NEGATIVE] }
    }
  });
  if (anyResponse > 0) {
    await this.setHeat(jobId, 1);
    return;
  }

  await this.setHeat(jobId, 0);
}
```

---

### **Testing Checklist**

#### Backend
- [ ] Create job with initialApplication → JobApplication created
- [ ] Create job with initialOutreach → Outreach created
- [ ] Positive outreach from MEDIUM/STRONG contact → heat escalates to 2
- [ ] Referral (REFERRAL or SENT_CV) recorded → heat = 3
- [ ] Update stage to TECH → heat recomputed without errors
- [ ] Update stage to OFFER → heat = 3
- [ ] Add application → lastTouchAt updated
- [ ] Get history → returns chronological entries

#### Frontend
- [ ] Create job via wizard → appears in table
- [ ] Filter by stage → only shows matching jobs
- [ ] Filter by heat → only shows matching jobs
- [ ] HeatBadge shows correct color (0=gray, 1=yellow, 2=orange, 3=red)
- [ ] Tailoring score validates (0-100 only)

---

## 🔍 **Troubleshooting**

### **Issue**: Heat not updating
**Check**:
1. Is `recalculateHeat()` being called after relevant events?
2. Does the job have referral/outreach data matching heat rules?
3. Database `heat` column updated?

### **Issue**: History not showing
**Check**:
1. JobStatusHistory entries created on stage changes?
2. `GET /jobs/:id/history` returning data?
3. Frontend rendering timeline component?

### **Issue**: Job wizard not creating application
**Check**:
1. `initialApplication` object in POST body?
2. `tailoringScore` provided?
3. Backend logs → JobApplication.create() called?

---

## 📚 **Related Documentation**
- [Contacts Module](./CONTACTS_MODULE.md) - Network tracking (outreach links to contacts)
- [Outreach Module](./OUTREACH_MODULE.md) - Communication attempts
- [Referrals Module](./REFERRALS_MODULE.md) - Tracking referrals for jobs
- [Architecture Overview](../architecture/SYSTEM_ARCHITECTURE.md) - High-level design

---

**Last Updated**: October 30, 2025
**Version**: 1.0
**Status**: Production Ready ✅
