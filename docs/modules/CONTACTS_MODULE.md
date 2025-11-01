# Contacts Module - Full Documentation

## 📋 **Table of Contents**
- [Overview](#overview)
- [Database Schema](#database-schema)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [API Reference](#api-reference)
- [Component Reference](#component-reference)
- [User Flows](#user-flows)
- [Development Guide](#development-guide)

---

## 🎯 **Overview**

The Contacts module manages your professional network in the job hunt system. It tracks relationships with people who can help with referrals, code reviews, and networking opportunities.

### **Key Features**
- Store contact information (name, email, phone, LinkedIn, GitHub)
- Associate contacts with companies (normalized)
- Track relationship strength (Weak/Medium/Strong)
- Categorize with tags
- View timeline of all interactions (outreaches, referrals, reviews)
- Timeline captures outreaches (with purpose), scheduled follow-ups, referrals, and reviews
- Search across multiple fields
- Auto-create companies on-the-fly
- Archive or permanently delete contacts with confirmation guard rails

### **Why This Matters**
Your network is critical in job hunting. This module helps you:
- Track who you know at which companies
- Remember when you last reached out
- See your complete interaction history
- Identify your strongest connections (Network Stars)

---

## 🗄️ **Database Schema**

### **Contact Model**
```prisma
model Contact {
  id          String           @id @default(cuid())
  name        String
  companyId   String?                    // FK to Company
  company     Company?         @relation(fields: [companyId], references: [id])
  role        String?
  strength    ContactStrength  @default(WEAK)

  // Contact Information (NEW in Contacts 1.0)
  email       String?
  phone       String?
  linkedinUrl String?
  githubUrl   String?
  location    String?
  tags        String[]         @default([])

  notes       String?
  archived    Boolean          @default(false)
  archivedAt  DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relations
  outreaches    Outreach[]
  referrals     Referral[]
  reviews       CodeReview[]
  eventLinks    EventContact[]
  followups     FollowUp[]
  notifications Notification[]

  @@index([strength])
  @@index([companyId])
  @@index([name])
}

enum ContactStrength {
  WEAK      // Just met, cold contact
  MEDIUM    // Had 1-2 conversations
  STRONG    // Warm relationship, would help
}
```

### **Company Model**
```prisma
model Company {
  id          String   @id @default(cuid())
  name        String
  domain      String?
  linkedinUrl String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contacts Contact[]
  jobs     Job[]

  @@index([name])
}
```

### **Key Relationships**
- **Contact → Company**: Many-to-One (multiple contacts at same company)
- **Contact → Outreach**: One-to-Many (track all outreach attempts)
- **Contact → Referral**: One-to-Many (track referrals they provided)
- **Contact → CodeReview**: One-to-Many (track code reviews they gave)

---

## 🔧 **Backend Architecture**

### **Module Structure**
```
backend/src/modules/contacts/
├── contacts.module.ts          # Module registration
├── contacts.controller.ts      # HTTP endpoints
├── contacts.service.ts         # Business logic
└── dto/
    ├── create-contact.dto.ts   # Validation for POST
    ├── update-contact.dto.ts   # Validation for PATCH
    ├── list-contacts-query.dto.ts  # Query params validation
    └── index.ts                # Barrel exports
```

### **ContactsService** (`contacts.service.ts`)

#### **Dependencies**
```typescript
@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesService: CompaniesService
  ) {}
}
```

#### **Methods**

**1. list(params)**
```typescript
async list(params?: {
  query?: string;        // Search across name, role, email, LinkedIn, GitHub
  strength?: ContactStrength;
  companyId?: string;    // Filter by company
  includeArchived?: boolean; // Opt-in to include archived contacts
  page?: number;         // Default: 1
  pageSize?: number;     // Default: 50
})
```
- **Search**: Case-insensitive OR across 5 fields
- **Pagination**: Skips (page - 1) * pageSize records
- **Computed Fields**:
  - `linkedJobs`: distinct jobs connected via outreach/referral (company, role, stage)
  - `lastTouchAt`: latest outreach or createdAt
  - `nextFollowUpAt`: earliest pending follow-up due date (if any)
- **Archival**: Excludes archived contacts unless `includeArchived=true`

**2. create(data)**
```typescript
async create(data: {
  name: string;
  companyId?: string;
  companyName?: string;  // Auto-creates company if provided
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  location?: string;
  tags?: string[];
  notes?: string;
  strength?: ContactStrength;
})
```
- **Auto-Company Creation**: If `companyName` provided → calls `companiesService.findOrCreate()`
- **Validation**: Email format, phone regex, URL format via Zod

**3. getById(contactId)**
```typescript
async getById(contactId: string)
```
- **Returns**: Contact with full company details
- **Timeline**: Unified array of outreaches (with purpose + job), upcoming/completed follow-ups, referrals, and reviews (last 20, sorted desc)
- **Includes**: Job details for outreach/referral events, project details for reviews
- **Guard**: Archived contacts raise 404 to keep UI consistent

**4. update(contactId, data)**
```typescript
async update(contactId: string, data: Partial<CreateContactData>)
```
- **Partial Update**: Only updates fields provided
- **Company Handling**: Can update companyId or auto-create via companyName

**5. promoteStrength(contactId, strength)**
```typescript
async promoteStrength(contactId: string, strength: ContactStrength)
```
- **One-Way**: Only promotes (WEAK → MEDIUM → STRONG), never demotes
- **Use Case**: Auto-promote when contact provides referral

**6. delete(contactId, options)**
```typescript
async delete(contactId: string, options: { hard?: boolean } = {})
```
- **Soft Delete (default)**: Sets `archived=true`, stamps `archivedAt`, updates open follow-ups with a dormancy note.
- **Hard Delete**: Nulls optional FK references (outreach, followup, notification) and deletes dependent rows (referrals, reviews, event contacts) before removing the contact.
- **Idempotent**: Archiving an already archived contact returns a success envelope without redundant writes.

**7. listNetworkStars()**
```typescript
async listNetworkStars()
```
- **Returns**: Top 5 contacts with most referrals
- **Order**: By referral count DESC

---

### **ContactsController** (`contacts.controller.ts`)

```typescript
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly outreachService: OutreachService,
    private readonly referralsService: ReferralsService,
    private readonly reviewsService: ReviewsService
  ) {}

  @Get()
  async list(@Query() query: ListContactsQueryDto)

  @Get('stars')
  async stars()

  @Get(':id')
  async getById(@Param() params: IdParamDto)

  @Post()
  async create(@Body() body: CreateContactDto)

  @Patch(':id')
  async update(@Param() params: IdParamDto, @Body() body: UpdateContactDto)

  @Post(':id/outreach')
  async outreach(@Param() params: IdParamDto, @Body() body: CreateContactOutreachDto)

  @Post(':id/referrals')
  async referral(@Param() params: IdParamDto, @Body() body: CreateReferralDto)

  @Post(':id/reviews')
  async review(@Param() params: IdParamDto, @Body() body: CreateReviewDto)
}
```

---

## 🎨 **Frontend Architecture**

### **Component Structure**
```
frontend/src/
├── pages/
│   └── ContactsPage.tsx        # Main page with table + search
├── components/
│   ├── CompanySelect.tsx       # Async searchable dropdown
│   ├── TagsInput.tsx           # Token-based tags input
│   ├── ContactDrawer.tsx       # Slide-over with details, edit, timeline, link-to-job CTA
│   ├── LinkJobDialog.tsx       # Contact → job linking (select or create job + outreach)
│   └── StrengthBadge.tsx       # Visual strength indicator
└── api/
    └── hooks.ts                # React Query hooks
```

### **State Management**

#### **React Query Hooks**
```typescript
// List contacts with search/filter
useContactsQuery({
  query?: string,
  strength?: string,
  companyId?: string,
  page?: number,
  pageSize?: number
})

// Get single contact with timeline
useContactDetailQuery(id: string)

// Mutations
useCreateContactMutation()
useUpdateContactMutation()
useCreateJobMutation()             // Inline job creation from LinkJobDialog
useCreateJobOutreachMutation()     // Log outreach linking contact ↔ job

// Companies
useCompaniesQuery(query?: string)
useCreateCompanyMutation()
```

#### **Local State** (ContactsPage)
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [strength, setStrength] = useState<string | undefined>();
const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
const [drawerOpen, setDrawerOpen] = useState(false);
```

---

## 📡 **API Reference**

### **Base URL**: `http://localhost:3001`

### **Endpoints**

#### **GET /contacts**
List contacts with search and filters.

**Query Parameters**:
```typescript
{
  query?: string;       // Search across name, role, email, linkedinUrl, githubUrl
  strength?: 'WEAK' | 'MEDIUM' | 'STRONG';
  companyId?: string;
  page?: number;        // Default: 1
  pageSize?: number;    // Default: 50
}
```

**Response**:
```json
[
  {
    "id": "cm...",
    "name": "Jane Smith",
    "companyId": "cm...",
    "company": {
      "id": "cm...",
      "name": "TechCorp",
      "domain": "techcorp.com"
    },
    "role": "Engineering Manager",
    "email": "jane@techcorp.com",
    "phone": "+1-555-0123",
    "linkedinUrl": "https://linkedin.com/in/janesmith",
    "githubUrl": null,
    "location": "San Francisco, CA",
    "tags": ["engineering", "management"],
    "strength": "MEDIUM",
    "lastTouchAt": "2025-10-25T10:00:00.000Z",
    "createdAt": "2025-10-20T08:00:00.000Z",
    "updatedAt": "2025-10-25T10:00:00.000Z"
  }
]
```

---

#### **GET /contacts/:id**
Get contact detail with timeline.

**Response**:
```json
{
  "id": "cm...",
  "name": "Jane Smith",
  "company": { "id": "cm...", "name": "TechCorp" },
  "role": "Engineering Manager",
  "email": "jane@techcorp.com",
  "phone": "+1-555-0123",
  "linkedinUrl": "https://linkedin.com/in/janesmith",
  "githubUrl": null,
  "location": "San Francisco, CA",
  "tags": ["engineering", "management"],
  "notes": "Met at conference, very helpful",
  "strength": "MEDIUM",
  "timeline": [
    {
      "type": "outreach",
      "date": "2025-10-25T10:00:00.000Z",
      "data": {
        "channel": "EMAIL",
        "messageType": "intro_request",
        "personalizationScore": 85,
        "context": "JOB_OPPORTUNITY",
        "outcome": "POSITIVE",
        "content": "Asked about open positions",
        "job": {
          "id": "job_123",
          "company": "TechCorp",
          "role": "Senior Engineer",
          "stage": "HR"
        }
      }
    },
    {
      "type": "followup",
      "date": "2025-10-28T09:00:00.000Z",
      "data": {
        "attemptNo": 1,
        "dueAt": "2025-10-28T09:00:00.000Z",
        "sentAt": null,
        "note": "Check on recruiter response",
        "job": {
          "id": "job_123",
          "company": "TechCorp",
          "role": "Senior Engineer",
          "stage": "HR"
        }
      }
    },
    {
      "type": "referral",
      "date": "2025-10-22T14:00:00.000Z",
      "data": {
        "kind": "REFERRAL",
        "job": {
          "company": "TechCorp",
          "role": "Senior Engineer"
        }
      }
    }
  ]
}
```

---

#### **POST /contacts**
Create new contact.

**Request Body**:
```json
{
  "name": "John Doe",
  "companyName": "StartupXYZ",  // Auto-creates company if doesn't exist
  "role": "CTO",
  "email": "john@startupxyz.com",
  "phone": "+1-555-9999",
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "githubUrl": "https://github.com/johndoe",
  "location": "New York, NY",
  "tags": ["startup", "cto", "tech-lead"],
  "notes": "Friend from college",
  "strength": "STRONG"
}
```

**Response**: Created contact object

---

#### **PATCH /contacts/:id**
Update contact.

**Request Body** (all fields optional):
```json
{
  "email": "newemail@example.com",
  "phone": "+1-555-1111",
  "location": "Seattle, WA",
  "tags": ["engineering", "leadership", "mentor"],
  "strength": "STRONG"
}
```

---

#### **DELETE /contacts/:id**
Archive or permanently delete a contact.

**Query Params**:
- `hard=true` (optional) → permanent delete

**Soft Delete Response**:
```json
{
  "success": true,
  "archived": true
}
```

**Hard Delete Response**:
```json
{
  "success": true,
  "hardDeleted": true
}
```

---

#### **GET /contacts/stars**
Get network stars (top referrers).

**Response**:
```json
[
  {
    "id": "cm...",
    "name": "Jane Smith",
    "company": { "name": "TechCorp" },
    "referrals": [
      { "id": "cm...", "kind": "REFERRAL" },
      { "id": "cm...", "kind": "INTRO" }
    ]
  }
]
```

---

#### **PATCH /outreach/:id**
Update outreach metadata (e.g., purpose/context, outcome, notes).

**Request Body (partial)**:
```json
{
  "context": "CODE_REVIEW",
  "content": "Sent portfolio for feedback"
}
```

**Response**: Updated outreach record (includes `contact` and `job` references for cache invalidation).

---

## 🧩 **Component Reference**

### **ContactsPage**
**Location**: `frontend/src/pages/ContactsPage.tsx`

**Purpose**: Main contacts listing with search and navigation.

**Features**:
- Search bar (name, email, role, LinkedIn, GitHub)
- Strength filter buttons (All/Weak/Medium/Strong)
- Table shows linked jobs (chips) and next follow-up alongside core fields
- Clickable rows → opens ContactDrawer
- Network Stars section

**Props**: None (route component)

---

### **ContactDrawer**
**Location**: `frontend/src/components/ContactDrawer.tsx`

**Purpose**: Slide-over panel for viewing/editing contact details.

**Props**:
```typescript
{
  contactId: string | null;
  open: boolean;
  onClose: () => void;
}
```

**Features**:
- **Details Tab**:
  - Form with all contact fields
  - CompanySelect for company
  - TagsInput for tags
  - Strength radio buttons
  - Validation (Zod + react-hook-form)
  - Save/Cancel buttons
  - Linked job chips (company/role/stage) and danger zone actions (archive vs hard delete)
- **Timeline Tab**:
  - Chronological activity list across outreach, follow-ups, referrals, and reviews
  - Outreach entries display purpose/outcome and allow inline editing of both outcome and context enums
  - Icons by type (outreach/referral/review/followup)
  - Relative dates + empty state messaging

---

### **CompanySelect**
**Location**: `frontend/src/components/CompanySelect.tsx`

**Purpose**: Searchable dropdown for selecting or creating companies.

**Props**:
```typescript
{
  value?: string;           // Company ID or name
  onChange: (value: {
    companyId?: string;
    companyName?: string
  }) => void;
  placeholder?: string;
}
```

**Features**:
- Async search (queries API as you type)
- Shows matching companies
- "Create new" option if no match
- Returns either `companyId` (existing) or `companyName` (new)

---

### **TagsInput**
**Location**: `frontend/src/components/TagsInput.tsx`

**Purpose**: Token-based input for managing contact tags.

**Props**:
```typescript
{
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;         // Default: 10
}
```

**Features**:
- Add tag on Enter or comma
- Remove tag by clicking X
- Max 10 tags, 50 chars each
- Visual counter
- Prevents duplicates

---

## 🔄 **User Flows**

### **Flow 1: View Contact List**
1. User navigates to `/contacts`
2. ContactsPage loads contacts via `useContactsQuery()`
3. Table displays with name, company, role, email, phone, strength, last touch
4. User can:
   - Type in search bar → filters contacts
   - Click strength filter → filters by WEAK/MEDIUM/STRONG

### **Flow 2: Create Contact**
1. User clicks the `New contact` pill in the Contacts header.
2. ContactDrawer opens in create mode with blank defaults (`strength = WEAK`).
3. User fills in name, optional company (searches existing companies or seeds a new one), and any other fields.
4. Submitting triggers `useCreateContactMutation()` → `POST /contacts`, shows a success toast, invalidates the contacts list, and immediately switches the drawer into edit mode for the newly created record.
5. When a new company name is provided (no `companyId`), the backend calls `companiesService.findOrCreate` to attach or create the organization automatically.

### **Flow 3: Edit Contact**
1. User clicks contact row in table
2. `handleRowClick()` sets `selectedContactId` and `drawerOpen=true`
3. ContactDrawer opens (slide-in animation)
4. `useContactDetailQuery(id)` fetches contact + timeline
5. Form populates with contact data and the header surfaces a **Linked roles** chip list showing every job tied to the contact (stage badge included).
6. User edits fields:
   - Types in CompanySelect → searches companies
   - Adds tags via TagsInput
   - Changes strength via radio buttons
7. User clicks "Save Changes"
8. `useUpdateContactMutation()` sends PATCH request
9. On success:
   - Query cache invalidated
   - Drawer closes
   - Table refreshes with new data

### **Flow 4: View Timeline**
1. User opens contact in drawer
2. Clicks "Timeline" tab
3. `useContactDetailQuery()` has fetched timeline array
4. Timeline component maps over items:
- Outreach: shows channel, personalization, message type, outcome, and job context plus a badge for “Purpose” (editable inline via dropdown).
  - Outcome dropdown updates immediately via `PATCH /outreach/:id`.
  - “Delete outreach” calls `DELETE /outreach/:id`, removes open follow-ups, and refreshes linked job/contact details.
   - Follow-up: highlights the due/completed status, associated job, and any reminder note.
   - Referral: shows job company/role
   - Review: shows project, score
5. Sorted by date DESC (most recent first) with empty state messaging when no history exists.

### **Flow 5: Delete or Archive Contact**
1. User opens the contact drawer (edit mode).
2. Scrolls to the **Danger zone** panel and clicks "Delete contact".
3. Inline confirmation exposes two options:
   - **Archive contact** → soft delete (`DELETE /contacts/:id`), keeps history but hides the record.
   - **Delete permanently** → passes `hard=true`, cascading removal of dependent records.
4. Mutation completes, toast confirms outcome, drawer closes, and the contacts table refreshes (archived records disappear unless explicitly requested via `includeArchived`).

---

### **Flow 5: Link Contact to Job**
1. From ContactDrawer header, user clicks `Add outreach`.
2. `LinkJobDialog` opens with two paths:
   - **Select job** tab: debounce search hits `/jobs?query=` and lists company/role/stage.
   - **Create job** tab: minimal job form submits to `POST /jobs` before outreach.
3. After job is chosen/created, the outreach mini-form (channel, message type, outcome, personalization score tooltip, optional notes/follow-up) is shown.
4. Submit logs outreach via `POST /jobs/:jobId/outreach` (passes `contactId` plus optional follow-up note).
5. Success toast, dialog slides above the drawer (higher z-index), closes cleanly, and React Query invalidates contact detail + jobs/heat caches so timelines, linked role chips, and job contact counts refresh instantly.
6. If the outreach is deleted from the timeline, `DELETE /outreach/:id` unlinks the contact and cancels open follow-ups; caches are invalidated so both contact and job views stay in sync.

---

## 🛠️ **Development Guide**

### **Adding New Contact Field**

#### 1. Update Prisma Schema
```prisma
model Contact {
  // ... existing fields
  twitter    String?  // NEW FIELD
}
```

#### 2. Run Migration
```bash
cd backend
npx prisma migrate dev --name add_contact_twitter
npx prisma generate
```

#### 3. Update DTOs
```typescript
// backend/src/modules/contacts/dto/create-contact.dto.ts
const schema = z.object({
  // ... existing fields
  twitter: z.string().regex(/^@\w+$/).optional()
});
```

#### 4. Update Frontend Type
```typescript
// frontend/src/api/hooks.ts - useContactsQuery response type
{
  // ... existing fields
  twitter?: string;
}
```

#### 5. Add to Form
```tsx
// frontend/src/components/ContactDrawer.tsx
<input {...register('twitter')} placeholder="@username" />
```

---

### **Adding Timeline Item Type**

#### 1. Add to Backend Query
```typescript
// contacts.service.ts - getById()
const timeline = [
  ...contact.myNewActivity.map(a => ({
    type: 'my_activity' as const,
    date: a.createdAt,
    data: a
  })),
  // ... existing items
];
```

#### 2. Add Frontend Icon
```tsx
// ContactDrawer.tsx - getTimelineIcon()
case 'my_activity':
  return <MyActivityIcon />;
```

#### 3. Add Frontend Display
```tsx
// ContactDrawer.tsx - Timeline tab
{item.type === 'my_activity' && (
  <div>Activity: {item.data.description}</div>
)}
```

---

### **Testing Checklist**

#### Backend
- [ ] Create contact with `companyName` → company auto-created
- [ ] Create contact with `companyId` → uses existing company
- [ ] Search by email → returns matches
- [ ] Search by LinkedIn → returns matches
- [ ] Filter by strength → only shows WEAK contacts
- [ ] Get by ID → includes timeline
- [ ] Update email → validates format
- [ ] Update tags → max 10 enforced

#### Frontend
- [ ] Click row → drawer opens
- [ ] Edit name → save → appears in table
- [ ] Type in CompanySelect → shows results
- [ ] Type in CompanySelect (new name) → "Create new" appears
- [ ] Add tag → chip appears
- [ ] Add 11th tag → prevented
- [ ] Remove tag → chip disappears
- [ ] Search contacts → table filters
- [ ] Change strength filter → table updates

---

## 🔍 **Troubleshooting**

### **Issue**: Search not working
**Check**:
1. Backend logs for SQL errors
2. Frontend network tab → verify query params sent
3. Prisma schema → ensure `mode: 'insensitive'` on search

### **Issue**: Company not auto-creating
**Check**:
1. `companyName` vs `companyId` in payload
2. Backend logs → `companiesService.findOrCreate()` called?
3. Database → check Company table for new record

### **Issue**: Timeline empty
**Check**:
1. Database → contact has related outreaches/referrals/reviews?
2. Backend → `getById()` includes timeline in response?
3. Frontend → `useContactDetailQuery` enabled?

### **Issue**: Drawer not opening
**Check**:
1. `selectedContactId` state set?
2. `drawerOpen` state true?
3. Radix Dialog `open` prop bound correctly?

---

## 📚 **Related Documentation**
- [Companies Module](./COMPANIES_MODULE.md) - Company normalization and CRUD
- [Jobs Module](./JOBS_MODULE.md) - Job tracking with company references
- [Architecture Overview](../architecture/SYSTEM_ARCHITECTURE.md) - High-level design

---

**Last Updated**: October 30, 2025
**Version**: 1.0
**Status**: Production Ready ✅
