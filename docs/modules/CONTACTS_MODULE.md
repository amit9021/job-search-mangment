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
- Search across multiple fields
- Auto-create companies on-the-fly

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
  page?: number;         // Default: 1
  pageSize?: number;     // Default: 50
})
```
- **Search**: Case-insensitive OR across 5 fields
- **Pagination**: Skips (page - 1) * pageSize records
- **Computed Field**: `lastTouchAt` = latest outreach.sentAt or contact.createdAt

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
- **Timeline**: Unified array of outreaches, referrals, reviews (last 20, sorted by date)
- **Includes**: Job details for referrals, project details for reviews

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

**6. listNetworkStars()**
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
│   ├── ContactDrawer.tsx       # Slide-over with Details + Timeline
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
        "outcome": "POSITIVE",
        "content": "Asked about open positions"
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

## 🧩 **Component Reference**

### **ContactsPage**
**Location**: `frontend/src/pages/ContactsPage.tsx`

**Purpose**: Main contacts listing with search and navigation.

**Features**:
- Search bar (searches name, email, role, LinkedIn, GitHub)
- Strength filter buttons (All/Weak/Medium/Strong)
- Enhanced table with 7 columns
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
- **Timeline Tab**:
  - Chronological activity list
  - Icons by type (outreach/referral/review)
  - Relative dates
  - Empty state

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

### **Flow 2: Edit Contact**
1. User clicks contact row in table
2. `handleRowClick()` sets `selectedContactId` and `drawerOpen=true`
3. ContactDrawer opens (slide-in animation)
4. `useContactDetailQuery(id)` fetches contact + timeline
5. Form populates with contact data
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

### **Flow 3: Create Contact (Auto-Company)**
1. User submits create contact form with `companyName: "NewCo"`
2. Backend `create()` method:
   - Calls `companiesService.findOrCreate("NewCo")`
   - If exists: uses existing company ID
   - If not: creates new company, returns ID
   - Creates contact with `companyId`
3. Response includes full contact + company object

### **Flow 4: View Timeline**
1. User opens contact in drawer
2. Clicks "Timeline" tab
3. `useContactDetailQuery()` has fetched timeline array
4. Timeline component maps over items:
   - Outreach: shows channel, outcome
   - Referral: shows job company/role
   - Review: shows project, score
5. Sorted by date DESC (most recent first)

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
