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
- Multi-stage pipeline (Applied → Screening → Interview → Offer → Rejected/Accepted)
- Heat scoring (0-3) based on activity and urgency
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
  heat        Int       @default(0)        // 0-3 urgency score
  deadline    DateTime?
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
}

enum JobStage {
  APPLIED       // CV sent
  SCREENING     // Phone screen / recruiter call
  INTERVIEW     // Technical / onsite interviews
  OFFER         // Offer received
  REJECTED      // Application rejected
  ACCEPTED      // Offer accepted
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
0 = Cold      - Just applied, no urgency
1 = Warm      - Some activity, deadline >7 days away
2 = Hot       - Active process, deadline 3-7 days
3 = Critical  - Deadline <3 days OR interview scheduled
```

Heat auto-recalculates based on:
- Days to deadline
- Recent outreach activity
- Application count
- Current stage

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
- **Algorithm**:
  1. Start with heat = 0
  2. If deadline within 3 days → heat = 3
  3. Else if deadline within 7 days → heat = 2
  4. Else if has recent outreach (last 3 days) → heat = 1
  5. Else if application count > 2 → heat = 1
  6. If stage is INTERVIEW → heat = max(heat, 2)
  7. If stage is OFFER → heat = 3
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
│   ├── JobsPage.tsx            # Main jobs table
│   └── DashboardPage.tsx       # Shows heat breakdown
├── components/
│   ├── JobWizardModal.tsx      # Create job with CV + outreach
│   └── HeatBadge.tsx           # Visual heat indicator (0-3)
└── api/
    └── hooks.ts                # React Query hooks
```

### **State Management**

#### **React Query Hooks**
```typescript
// List jobs with filters
useJobsQuery(filters?: {
  stage?: string;
  heat?: number;
})

// Mutations
useCreateJobMutation()
```

#### **Local State** (JobsPage)
```typescript
const [stageFilter, setStageFilter] = useState<JobStage | undefined>();
const [heatFilter, setHeatFilter] = useState<number | undefined>();
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
  stage?: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'ACCEPTED';
  heat?: 0 | 1 | 2 | 3;
}
```

**Response**:
```json
[
  {
    "id": "cm...",
    "company": "TechCorp",
    "role": "Senior Engineer",
    "stage": "INTERVIEW",
    "heat": 2,
    "sourceUrl": "https://techcorp.com/careers/senior-engineer",
    "deadline": "2025-11-15T00:00:00.000Z",
    "lastTouchAt": "2025-10-28T10:00:00.000Z",
    "createdAt": "2025-10-20T08:00:00.000Z",
    "updatedAt": "2025-10-28T10:00:00.000Z"
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
    "content": "Hi John, saw you work at StartupXYZ..."
  }
}
```

**Response**: Created job object

**Business Logic**:
1. Creates Job with stage=APPLIED
2. Creates JobStatusHistory entry
3. If `initialApplication` provided → creates JobApplication
4. If `initialOutreach` provided → creates Outreach record
5. Heat auto-calculated based on deadline

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
  "stage": "INTERVIEW",
  "note": "Scheduled for Nov 5th, 2pm - 3 rounds"
}
```

**Side Effects**:
- Creates JobStatusHistory entry
- Updates `job.lastTouchAt` and `updatedAt`
- Recalculates heat (INTERVIEW → heat >= 2, OFFER → heat = 3)

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
  "content": "Thanks for connecting! Would love to chat about..."
}
```

**Side Effects**:
- Creates Outreach record
- Updates `job.lastTouchAt`
- If outcome=POSITIVE → may promote contact strength

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
    "stage": "SCREENING",
    "note": "Recruiter call scheduled for Oct 25",
    "timestamp": "2025-10-22T14:00:00.000Z"
  },
  {
    "id": "cm...",
    "stage": "INTERVIEW",
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
- Filter by stage (Applied/Screening/Interview/etc.)
- Filter by heat (0/1/2/3)
- Sort by last updated
- Click job → navigate to detail view

**Props**: None (route component)

---

### **JobWizardModal**
**Location**: `frontend/src/components/JobWizardModal.tsx`

**Purpose**: Create new job with optional CV submission and outreach.

**Features**:
- **Step 1**: Job details (company, role, URL, deadline)
- **Step 2**: CV submission (tailoring score)
- **Step 3**: Optional outreach (contact, channel, message)
- Validation (Zod + react-hook-form)
- Multi-step form with progressive disclosure

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
   - Selects contact from dropdown
   - Chooses channel (Email/LinkedIn/etc.)
   - Enters personalization score
   - Writes message content
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
1. User views job detail (or from jobs table)
2. Clicks "Update Status" button
3. Selects new stage (e.g., SCREENING → INTERVIEW)
4. Enters note (e.g., "3 rounds scheduled for Nov 5")
5. Clicks "Save"
6. Backend:
   - Updates `job.stage`
   - Creates JobStatusHistory entry
   - Recalculates heat (INTERVIEW → heat >= 2)
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
IF deadline in 0-3 days:
  heat = 3 (CRITICAL)
ELSE IF deadline in 4-7 days:
  heat = 2 (HOT)
ELSE IF has outreach in last 3 days:
  heat = 1 (WARM)
ELSE IF application count > 2:
  heat = 1 (WARM)
ELSE:
  heat = 0 (COLD)

IF stage = INTERVIEW:
  heat = max(heat, 2)  // Interviews are always at least HOT

IF stage = OFFER:
  heat = 3  // Offers are always CRITICAL
```

---

### **Flow 4: View Job History**
1. User clicks job in table (or navigates to detail page)
2. Frontend calls `GET /jobs/:id/history`
3. Backend returns all JobStatusHistory entries
4. UI displays timeline:
   - Oct 20: Applied (Job created)
   - Oct 22: Screening (Recruiter call scheduled)
   - Oct 28: Interview (3 rounds scheduled)
5. User can see full progression

---

## 🧠 **Business Logic**

### **Heat Recalculation Rules**

#### **Deadline-Based**
- **3 days or less** → Heat = 3 (CRITICAL)
- **4-7 days** → Heat = 2 (HOT)
- **8+ days** → Does not affect heat

#### **Activity-Based**
- **Recent outreach** (last 3 days) → Heat = 1 (WARM)
- **Multiple applications** (>2) → Heat = 1 (WARM)

#### **Stage-Based**
- **INTERVIEW** → Heat >= 2 (minimum HOT)
- **OFFER** → Heat = 3 (always CRITICAL)
- **APPLIED/SCREENING** → No stage boost

#### **Combined**
Heat is the **maximum** of all applicable rules.

**Example**:
- Deadline in 10 days (no boost)
- 3 applications submitted (heat = 1)
- Stage = INTERVIEW (heat = 2)
- **Final Heat**: 2 (HOT)

---

### **Automatic Follow-Up Creation**

**Trigger**: Job stage changes to specific values

**Rules**:
- **SCREENING** → Create follow-up for 3 days later ("Check in after screen")
- **INTERVIEW** → Create follow-up for 1 day after interview date ("Send thank you note")

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
  SCREENING
  INTERVIEW
  TECHNICAL_TEST  // NEW STAGE
  OFFER
  REJECTED
  ACCEPTED
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
  'SCREENING',
  'TECHNICAL_TEST',  // NEW
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'ACCEPTED'
];
```

---

### **Customizing Heat Algorithm**

**File**: `backend/src/modules/jobs/jobs.service.ts`

**Method**: `private async recalculateHeat(jobId: string)`

**Example**: Add boost for jobs at specific companies
```typescript
private async recalculateHeat(jobId: string) {
  const job = await this.prisma.job.findUnique({
    where: { id: jobId },
    include: { applications: true }
  });

  let heat = 0;

  // ... existing deadline logic ...

  // NEW: Priority companies get heat boost
  const priorityCompanies = ['Google', 'Meta', 'Anthropic'];
  if (priorityCompanies.includes(job.company)) {
    heat = Math.max(heat, 1);  // At least WARM
  }

  // ... rest of logic ...

  await this.prisma.job.update({
    where: { id: jobId },
    data: { heat }
  });
}
```

---

### **Testing Checklist**

#### Backend
- [ ] Create job with initialApplication → JobApplication created
- [ ] Create job with initialOutreach → Outreach created
- [ ] Create job with deadline in 2 days → heat = 3
- [ ] Update stage to INTERVIEW → heat >= 2
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
2. Deadline format correct (ISO 8601 string)?
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
