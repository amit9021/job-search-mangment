## Fix Contact Linking & Creation Plan

### 1. Summary & Goals
- Ensure JobWizardModal can create a new contact inline when the provided identifier is not an existing contact.
- Resolve unexpected error toast after successful contact creation from the Link Contact dialog; the new contact should link and appear immediately.
- Restore full create/update functionality in ContactDrawer so contacts can be added or edited without errors.

### 2. Current Observations / Hypotheses
- JobWizardModal likely only supports `contactId`; inline create path may be missing or misformatted (`initialOutreach.contactCreate` undefined).
- Link Contact dialog returns 201 but triggers error toast, suggesting parse failure, missing `contact` in response, or mutation error handler misreads payload.
- Contact create/edit probably failing due to API validation (missing required fields, schema mismatch) or front-end form submission not mapping to expected DTO.

### 3. Action Plan
1. **Reproduce & Trace**
   - [x] Capture wizard payloads for new contact outreach.
   - [x] Inspect Link Contact dialog network responses & error handling.
   - [x] Verify contact create/edit flows capture API errors.
2. **Backend Adjustments**
   - [x] Confirm DTOs/services support inline contact creation from job outreach.
3. **Frontend Fixes**
   - [x] Add inline “new contact” path to JobWizardModal outreach step.
   - [x] Harden Link Contact dialog response handling (success toast, query invalidation).
   - [x] Add create-mode support + robust error handling to ContactDrawer.
   - [x] Ensure nested Link Job dialog renders above drawer with consistent close behaviour.
4. **Testing**
   - [x] Extend RTL coverage for wizard/linking flows.
   - [ ] Add regression coverage for nested dialog layering.
5. **Documentation & Regression Notes**
   - [x] Update Jobs & Contacts docs with new flows.
   - [x] Summarize fixes in `docs/fix-plan.md`.

### 4. Risks & Mitigations
- **Risk:** Changing DTOs may break existing flows — mitigate with unit/e2e tests.
- **Risk:** UI state complexity (multiple dialogs) — centralize mutation error handling and thoroughly test success/error branches.

### 5. Completion Criteria
- JobWizardModal can create a brand-new contact and completes outreach without errors.
- Link Contact dialog shows success toast (no error) and linked contact appears in job & contact timelines.
- Creating or editing a contact via ContactDrawer succeeds and updates UI instantly.

### Status
- [x] Job wizard inline contact creation implemented
- [x] Link Contact dialog no longer surfaces false error after creating a new contact
- [x] ContactDrawer supports both create and edit flows with toasts and cache refresh
