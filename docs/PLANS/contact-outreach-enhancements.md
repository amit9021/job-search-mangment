## Contact & Outreach Enhancements Plan

### 1. Summary & Goals
- Surface follow-up context in the job history timeline, including the specific contact and follow-up target.
- Upgrade JobWizardModal’s “Log outreach now & queue follow-up” step with contact autosuggest, inline creation fields that keep the submit button visible, and ensure new contacts persist.
- Guarantee contacts created via the job wizard appear immediately in the Contacts module and drawer (no missing records).
- Provide a contact deletion capability with safe confirmation flows and data handling.
- Display the jobs associated with a contact everywhere relevant (list, drawer header, timeline).
- Enrich contact timeline entries with configurable context for outreach, referrals, reviews, or ad-hoc notes so users understand “why” an outreach happened.

### 2. Current Observations / Pain Points
- Job history timeline follow-up entries show due dates but not the contact, leaving the user unsure who to ping.
- JobWizardModal outreach step accepts raw text, offers no suggestions, and when rendering the inline contact form pushes the “Create job” button off-screen.
- Inline contact creation during job creation logs outreach but the contact does not show in the Contacts page, suggesting the backend omits creation or the UI fails to refresh.
- There is no supported workflow to delete a contact (only create/update).
- Contact views lack explicit job associations, making it hard to audit touchpoints.
- Contact timeline outreach items show limited metadata; no ability to generalize the context (e.g., code review vs. job outreach vs. casual check-in).

### 3. Scope & Deliverables
- **In scope:** Backend DTO/service updates, UI refactors, follow-up display changes, contact deletion API, React Query cache wiring, tests, and documentation updates.
- **Out of scope:** Bulk contact deletion, role-based permissioning for destructive actions, advanced tagging/CRM features beyond context annotations.

### 4. Proposed Implementation Outline
#### A. Backend
1. **Follow-up Context API**
   - Extend `JobsService.getHistory` to include follow-up contact linkage (requires storing contactId on follow-ups if not already present).
   - Ensure follow-up entries returned via `/jobs/:id/history` include `{ contact: { id, name, role } | null }` and optional note.
2. **Contact Creation via Job Wizard**
   - Audit `JobsService.recordJobOutreach` and `ContactsService.create`; fix transactional behavior so inline `contactCreate` persists and returns the new record.
   - Return enough contact data for frontend cache updates (id, name, role, company).
3. **Contact Deletion Endpoint**
   - Add `DELETE /contacts/:id` controller + service method supporting soft delete (default) with optional hard delete.
   - Handle dependent data (outreach, followups) according to business rules (likely retain history but mark contact inactive).
4. **Contact Timeline Context**
   - Introduce a `context` payload in outreach creation DTO (enum or string) to capture purpose (“job_outreach”, “code_review”, “check_in”, etc.).
   - Persist context on outreach model (migration if needed) and include related job summary optionally.
5. **General Data Adjustments**
   - Ensure follow-up creation wires contactId consistently.
   - Update Prisma schema/migrations if new fields required (e.g., outreach.context, contact.archived flag for deletion).

#### B. Frontend
1. **Job History Timeline**
   - Display follow-up entries with contact chips + click-to-open (reuse `handleOpenContact`).
   - Include contextual note for follow-ups referencing the job/contact.
2. **JobWizardModal Enhancements**
   - Replace plain text contact field with an autosuggest (query `/contacts?query=`).
   - When user types a new name, show inline “Create new contact” card with fields (role/email/linkedin) in a collapsible section that does not push the submit button off-screen (e.g., scroll container/min-height).
   - Make modal vertically scrollable with sticky footer to keep action buttons visible.
   - After successful creation, ensure contact drawer and Contacts page reflect new contact (invalidate queries + optionally open).
3. **Contact Persistence & Cache**
   - On job wizard submission with `contactCreate`, merge returned contact into contact cache.
   - If backend returns contact summary, insert into React Query cache; otherwise refetch contact list.
4. **Contact Deletion UI**
   - Add delete affordance in ContactDrawer (danger section) with confirmation dialog (soft delete default, optional hard delete).
   - On delete, close drawer, show toast, invalidate contacts/jobs queries as needed.
5. **Contact Job Associations**
   - In Contacts table rows and drawer, render chips/links for associated jobs (company & role, stage pill).
   - Ensure clicking a job from the contact drawer opens job history or job drawer (depending on available UI).
6. **Timeline Context Editing**
   - Allow editing outreach context in timeline (e.g., inline dropdown or modal) when not tied to a job.
   - When logging outreach (Link Contact/Link Job dialogs, JobWizardModal), include a “Purpose” select with the new context enum.

#### C. Documentation & UX Notes
- Update Jobs and Contacts module docs with new UI behaviors (autosuggest, context labels, deletion).
- Document new API endpoints/fields in `docs/context` or API reference.

### 5. Risks & Mitigations
- **Auto-suggest performance**: large contact lists could slow search → implement debounce + backend limit.
- **Deletion side effects**: removing contacts referenced by outreach/followups may affect reports → opt for soft delete by default and clearly label destructive option.
- **Modal layout regressions**: ensure responsive design by testing on common breakpoints and adding unit tests for button visibility.
- **Schema changes**: If migrations required (e.g., new outreach context field), coordinate dev DB resets and update seed data.

### 6. Testing Strategy
- **Backend unit/e2e**: cover follow-up history payload, contact creation via outreach, contact deletion (soft/hard), outreach context persistence.
- **Frontend RTL**: JobWizardModal autosuggest + inline create path; timeline follow-up display; contact deletion dialog; context editing.
- **Manual QA**: Create job with outreach → verify contact persists; delete contact → ensure removed/archived; review contact timeline for accurate context.

### 7. Documentation Tasks
- `docs/modules/JOBS_MODULE.md`: add follow-up contact visibility and wizard autosuggest documentation.
- `docs/modules/CONTACTS_MODULE.md`: document deletion flow, job chips, context fields.
- `docs/fix-plan.md`: append summary of shipped improvements.
- Update any onboarding/setup docs if schema changes occur.

### Status
- [x] Backend: follow-up contact context, contact deletion endpoint, outreach context field, contact list linked jobs/next follow-up.
- [x] Frontend: Job wizard autosuggest + context, Job history follow-up chips, Contact drawer timeline/context editing, contact deletion UX, contact list job chips.
- [x] Tests & Docs: Vitest/Jest suites updated, module docs refreshed, fix-plan noted.
