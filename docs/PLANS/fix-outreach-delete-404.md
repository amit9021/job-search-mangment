## Fix Outreach Delete 404 Plan

### 1. Summary
- Reproduce the failing `DELETE /outreach/:id` request reported from the UI.
- Identify why the backend returns 404 despite the controller route being present.
- Deliver a robust fix with regression coverage.

### 2. Current Signals / Hypotheses
- Frontend mutation uses `api.delete('/outreach/${id}')`; PATCH on the same resource succeeds, so base URL and auth likely fine.
- Outreach controller recently gained `@Delete(':id')`, but the module wiring (exports/imports) or guard configuration might block the route.
- E2E test for delete currently passes in mocks; the real service may 404 due to missing record lookup (`findUnique`) or transaction scope differences.
- Possible mismatch between job/contact IDs in payload vs. query strings when cancelling follow-ups.

### 3. Planned Tasks
1. **Reproduce & Capture Context**
   - Trigger delete from Jobs history and Contact timeline, record request path, body, and server response.
   - Inspect backend logs to confirm which route is hit (or not) and the Prisma query leading to 404.
2. **Backend Inspection**
   - Verify `OutreachModule` is imported by `AppModule` and that authentication guards allow DELETE.
   - Add unit coverage for `OutreachService.delete` happy-path + not-found cases (ensure we expect 404 only when the record is missing).
   - Double-check follow-up cancellation to ensure it doesn't throw when jobId/contactId null.
3. **Implement Fix**
   - If controller wiring issue → adjust module exports or route prefix.
   - If Prisma lookup fails due to soft-delete expectations → ensure we fetch outreach including jobId/contactId; handle not-found gracefully with 404 and frontend messaging.
   - Ensure follow-up cleanup tolerates null job/contact combos.
4. **Testing**
   - Extend e2e tests to cover real delete via mocked Prisma returning `null` + success path.
   - Add frontend RTL test that stubs API to 200 and asserts the dialog closes + caches invalidate.
   - Manual QA: delete outreach from both job history and contact timeline; verify follow-ups removed and heat recalculated.

### 4. Risks / Mitigations
- Accidentally allowing delete for unauthorized users → respect existing auth guards.
- Deleting outreach with existing follow-up history → ensure only open follow-ups removed; past ones left intact.

### 5. Timeline / Dependencies
- No external dependencies; focus on outreach module and shared hooks.
