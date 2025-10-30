## 1) Summary & Goals
- Enable linking an existing job to any contact directly from the pipeline in `frontend/src/pages/JobsPage.tsx` via a new `LinkContactDialog` without requiring the job to have a contact up front.
- Allow linking a contact to an existing or newly created job from the `ContactDrawer` in `frontend/src/components/ContactDrawer.tsx`, including inline job creation.
- Support inline contact creation inside the job linking dialog by reusing the server-side contact creation flow and exposing a lightweight contact form.
- Support inline job creation from the contact drawer by calling the existing `POST /jobs` endpoint with minimal required fields and optional extras.
- Persist the job↔contact relationship by creating an Outreach record that includes both `jobId` and `contactId`, using the enhanced `JobsService.recordJobOutreach`.
- Keep job creation flexible so `contactId` remains optional on `POST /jobs`, while still allowing outreach to be attached later.
- Provide first-class job stage management (Applied/HR/Tech/Offer/Rejected/Dormant) with note capture so both the table view and job drawer can update status and history immediately.

## 2) Scope & Non-Goals
- **In scope:** extend backend DTOs/services (`CreateJobOutreachDto`, `JobsService`, `OutreachService`, `ContactsService`) and React UI components (`JobsPage`, `JobHistoryModal`, `ContactDrawer`) to support bidirectional linking; add optimistic React Query mutations, validation, and toast messaging.
- **In scope:** add a table view component (`JobListTable`) that surfaces stage, contact counts, last touch, next follow-up, and actions; wire stage editing and dialogs from that table.
- **Not in scope:** building a dedicated many-to-many join beyond Outreach, bulk linking/import flows, or new external integrations (LinkedIn, ATS, CRM); advanced referral-role mapping remains out of scope.
- **Not in scope:** redesigning existing modules beyond what is required for the new dialogs/table, or migrating personalizationScore storage type (will remain numeric with server-side defaults).

## 3) UX Specs
**A) From Jobs page / Job drawer**
- Add a `Link contact` pill button alongside Edit/History on each job card inside `JobsPage.tsx`; the same action will appear in the upcoming `JobListTable` row actions and inside the `JobHistoryModal` header.
- Implement `LinkContactDialog.tsx` using Radix Dialog + Tabs:
  1. **Select existing** tab: searchable combobox powered by `/contacts?query=` with debounced queries; shows name, role, company; selecting enables the outreach form step.
  2. **Create new** tab: minimal form (name required; role, email, linkedinUrl optional; company field prefilled with job.company, editable); submission creates the contact via `POST /contacts` and feeds the new id back into the outreach step.
- After a contact is selected/created, show the inline outreach form (channel select default EMAIL, messageType dropdown, personalizationScore slider/number with tooltip, optional content textarea, follow-up toggle) and submit to `POST /jobs/:id/outreach`.
- On success: toast “Linked to {contact.name}”, close dialog, invalidate `['jobs']`, `['jobs', jobId]`, and `['contacts', contactId]`, and refetch job history if open.

**B) From Contacts page / Contact drawer**
- Place a `Link to job` button in the contact drawer header next to the strength badge.
- Create `LinkJobDialog.tsx` with tabs:
  1. **Select job** tab: async search hitting `/jobs?query=` (extend backend filter to accept `query` to match company/role); list shows company, role, stage, deadline.
  2. **Create job** tab: lightweight form (company & role required; sourceUrl and deadline optional with inline deadline tooltip; optional heat select).
- After job selection/creation, reuse the outreach form component but prefill the contact id; submit via `POST /jobs/:jobId/outreach` providing `contactId`.
- On success: toast “Outreach logged for {job.company}”, close dialog, invalidate the contact detail (`['contacts', contactId]`) and job caches (`['jobs']`, `['jobs', jobId]`), ensure timeline refreshes.

**C) Jobs table columns**
- Introduce a toggle on `JobsPage` to switch between the current kanban-style pipeline and a new table rendered via `JobListTable.tsx`.
- Table columns: Company, Role, Stage (inline select), Heat (badge), Contacts (# distinct outreach contacts via aggregated field), Last touch (distance helper), Next follow-up (soonest pending follow-up), Deadline, Source (link if provided), Actions (View history, Link contact, Delete).
- Stage select opens a small note modal (`UpdateJobStageDialog`) before PATCHing; actions column reuses existing handlers (edit/hard delete) and links to the new dialog.

**D) Update stage**
- Inline stage select in `JobListTable` triggers `UpdateJobStageDialog` with stage dropdown + note textarea; on confirm, call `POST /jobs/:id/status`, optimistically update cache, push toast, and refresh history.
- Inside `JobHistoryModal`, add a stage dropdown with note prompt to allow status updates while reviewing timeline; append new history entry immediately after server success.

**E) Tooltips & help text**
- Tailored Resume score field in `JobWizardModal` gets tooltip “How well did you adapt your CV to this job (0-100).”
- Personalization score input in the outreach form component gets tooltip “How customized was your message to the person/company (0-100).”
- Deadline input in both job creation/edit forms shows helper text “Application close / target date (optional).”

## 4) Data Model & API Touchpoints
- Continue using Outreach (`prisma.outreach`) to capture the job-contact link; extend `CreateJobOutreachDto` to accept `contactId` or `contactCreate` and optional personalizationScore/content/follow-up flags.
- Update `CreateJobDto` to keep `initialOutreach` optional and compatible with the new schema; ensure `contactId` defaults to null when omitted.
- Enhance `JobsService.recordJobOutreach` to:
  * create contacts inline by delegating to `ContactsService.create` when `contactCreate` provided;
  * ensure outreach returns related contact data and a minimal job summary (id, company, stage, heat, lastTouchAt, contactsCount).
- Extend `JobsService.list` to support free-text search, include aggregated contact counts (distinct outreach contacts) and earliest upcoming follow-up date per job.
- Adjust `POST /jobs/:id/status` to return the updated job plus the newly created `JobStatusHistory` entry for UI updates.
- Surface new query params on `/contacts` and `/jobs` for search-as-you-type; ensure pagination defaults remain intact.

## 5) Validation & Errors
- Use Zod refinements in DTOs to accept either `contactId` or valid `contactCreate` payload (reject if neither); coerce personalizationScore to number and clamp 0-100, defaulting to 70 when omitted.
- Validate inline contact creation fields on both client (react-hook-form + zod) and server (new `InlineContactCreateSchema`).
- Convert backend service failures (missing job/contact, validation) into descriptive messages via existing `HttpExceptionFilter` so toast notifications display actionable text.
- Client-side forms surface field-level errors when backend returns `fieldErrors`; general errors go to toast.

## 6) Acceptance Criteria
- Users can create a job without specifying any contact and later link contacts through the new dialog from job cards or table rows.
- From a job card/table row: selecting or creating a contact followed by outreach submission updates the job’s contact count and last touch; the linked contact’s timeline reflects the outreach.
- From a contact drawer: selecting or creating a job and submitting outreach updates the contact timeline and the job’s contact metrics.
- Stage changes (Applied/HR/Tech/Offer/Rejected/Dormant) are available from table and job history modal, capture notes, and append to status history.
- Tooltips for Tailored Resume, Personalization, and Deadline appear in the relevant forms.
- Job creation keeps contact optional while allowing linking later from either direction.

## 7) Test Plan
- **Backend e2e (`backend/test/app.e2e-spec.ts`)**
  1. Create job without contact -> 201 and no outreach.
  2. Create contact -> 201.
  3. POST `/jobs/:id/outreach` with existing `contactId` → outreach persisted, job lastTouch updated, contact timeline fetch shows entry.
  4. POST `/jobs/:id/outreach` with `contactCreate` → new contact exists, outreach links both.
  5. POST `/jobs/:id/status` with stage `HR` and note → response carries updated job + history entry, status history length increments.
- **Frontend RTL (`frontend/src/pages/__tests__/JobsPage.spec.tsx`, `frontend/src/components/__tests__/ContactDrawer.spec.tsx`)**
  1. Jobs table: open link dialog, select existing contact mock, submit outreach, assert mutation called and toast shown.
  2. Contact drawer: open link dialog, create job inline, submit outreach, verify query invalidation mocks and toast.
  3. Stage change flow: simulate stage edit from table and from job history modal; ensure note modal appears and mutation invoked.
- **Manual QA**
  - Create job with no contact → link contact from job → verify counts/timeline.
  - Create contact → link to existing job → verify both sides update.
  - Create contact → create new job inline from contact → outreach recorded.
  - Update job stage multiple times and confirm history entries/time stamps.
  - Confirm tooltips render and forms validate score ranges.

## 8) Docs to Update at the End
- `docs/modules/JOBS_MODULE.md`: add sections describing table columns, Link Contact flow, and stage update dialog behavior with referenced endpoints.
- `docs/modules/CONTACTS_MODULE.md`: document Link to Job flow, inline job creation, and outreach timeline updates.
- `docs/fix-plan.md`: append a concise “What changed” entry referencing the new linking feature.
