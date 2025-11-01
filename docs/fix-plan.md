# Jobs Module Fix Plan

## Summary of Current Issues
- **(Resolved) Job creation validation mismatch** – The wizard previously submitted `deadline` as a date-only string while the backend expected ISO datetimes. Deadline input has been removed, DTOs were relaxed, and job creation now succeeds without extra coercion.
- **DELETE /jobs/:id returns 500** – `JobsService.delete` (`backend/src/modules/jobs/jobs.service.ts:107-114`) calls `prisma.job.delete` without cascading deletions. When a job has applications, outreach, or status history (`prisma/schema.prisma` relations are `onDelete: Restrict`), Prisma raises `P2003` and Nest returns a 500.
- **Frontend unable to add a Job or open full Job details consistently** – Because the create mutation fails, React Query (`frontend/src/api/hooks.ts:102-155`) caches an error state and the UI closes the modal with no toast. Subsequent attempts to open the edit modal rely on `useJobDetailQuery`, but missing records/400 responses leave the modal empty, so users perceive it as broken.

## What Changed (2025-10-30)
- Implemented cross-linking between jobs and contacts via outreach dialogs (existing or inline record creation), introduced a tabular jobs view with contacts count/next follow-up columns, and added stage update notes so both timelines stay in sync.
- Extended JobWizardModal to accept contact IDs or ad-hoc names (with optional email/LinkedIn) so new contacts are created automatically when logging outreach.
- Added a `New contact` CTA on the Contacts page with a create-mode drawer, plus success/error handling for both contact creation and updates.
- Surfaced linked contacts on pipeline cards, the jobs table, and the job history modal, and mirrored the relationship from the contact drawer with a "Linked roles" chip list so users can confirm associations immediately after linking.

## What Changed (2025-11-01)
- Job history timeline now shows the exact contact tied to each follow-up and allows opening their drawer directly from the modal chips.
- JobWizardModal contact picker supports autosuggest for existing contacts, inline creation that keeps the primary actions visible, and a new “Purpose” selector that tags outreach context.
- Contact Drawer gains a danger zone (archive vs hard delete), outreach entries expose editable purpose badges, and follow-ups appear alongside outreach/referral/review history.
- Contacts table lists linked jobs and next follow-up dates, making it easy to confirm which roles each person is attached to after linking from either direction.

## What Changed (2025-11-02)
- Archived jobs now display in a dedicated panel (and table view) when “Show Archived” is toggled, preventing freshly archived roles from disappearing.
- Next follow-up indicators show neutral day counts (e.g., `3 days`) instead of negative phrasing, matching the UX expectation for countdowns.
- Heat recalculation aligns with the documented hierarchy—referrals (3), strong/medium positives (2), other responses (1), archived/default (0)—with targeted unit tests guarding each branch.

## Root-Cause Hypotheses
- DTO/validation mismatch between frontend JobWizard payload and backend CreateJobDto – The DTO expects ISO strings and enum-safe payloads while the wizard provides date-only strings and loosely typed outreach fields, leading to validation failures.
- Zod/class-validator rules causing 400 on missing/invalid fields (e.g., date format, enum stage, numeric types) – Global `ZodValidationPipe` returns flattened error objects; without coercion the DTO rejects numeric strings and non-ISO dates, and the frontend does not parse the response.
- 500 on delete likely due to FK constraints (Job has related applications/outreaches/history → Prisma delete fails) – Child tables (`JobApplication`, `JobStatusHistory`, `Outreach`, `FollowUp`, `Referral`) hold references that block hard deletes unless explicitly cascaded or removed.
- CORS or baseURL mismatch; React Query calling wrong URL or missing headers – `ApiProvider` defaults `baseURL` to `/api` (`frontend/src/api/ApiProvider.tsx:16`); outside the dev proxy the browser hits the frontend origin instead of `http://localhost:3001`, and there are no standard headers/toasts to reveal the failure.
- Missing error handling on controller/service leading to generic 500s – Controllers let Prisma exceptions bubble; there is no exception filter translating `P2003` or Zod errors into friendly messages, so clients receive opaque 500s while logs lack context.

## Acceptance Criteria (must-haves)
- Creating a job via the wizard returns 201 with the persisted job (id, stage, timestamps) and refreshes the list automatically.
- Updating an existing job (stage, company link, heat recalculation) continues to succeed with no regressions in history or last-touch updates.
- Deleting a job from the UI defaults to a soft delete (job hidden from active list, no 500s) and supports an explicit `?hard=true` development path that handles FK cleanup or returns clear 409 errors.
- `GET /jobs`, `GET /jobs/:id/history`, `POST /jobs/:id/applications`, `POST /jobs/:id/status`, and `POST /jobs/:id/outreach` function end-to-end from the UI with visible success/error toasts and no console errors.
- API errors surface meaningful messages to the UI, and backend logs capture structured entries (route, jobId, requestId) instead of raw stack traces.

## Planned Changes (Backend)
- ✅ Align job DTOs (`backend/src/modules/jobs/dto/*.ts`) with the module spec: coerce date-only strings to ISO, permit optional `initialApplication`/`initialOutreach`, and keep defaults (`stage = APPLIED`, `heat` recalculated server-side).
- ✅ Update `JobsService.create` (`backend/src/modules/jobs/jobs.service.ts`) to normalize dates, wrap job creation + optional application/outreach creation in a transaction, bump `lastTouchAt`, and return the hydrated job including relationships needed by the UI.
- ✅ Replace `JobsService.delete` with a soft-delete path (set `stage = DORMANT`, add `archived`/`archivedAt` fields via Prisma migration) and implement an optional hard delete that cascades related records within a transaction. Expose the `hard` flag via `JobsController.delete`.
- ✅ Filter archived jobs out of `list()` by default, with an opt-in `includeArchived` query param. Ensure history queries order by timestamp and recalc heat after mutations so the pipeline reflects current state.
- ✅ Introduce a global exception filter (`backend/src/common/filters/http-exception.filter.ts`) to map Zod and Prisma errors to structured HTTP responses while logging with Nest's logger/requestId.
- ⚠️ Add integration/e2e coverage in `backend/test/e2e/jobs.e2e-spec.ts` for create/delete flows. (Current status: unit coverage lives in `backend/src/modules/jobs/jobs.service.spec.ts`; end-to-end coverage still pending.)

## Planned Changes (Frontend)
- ✅ Centralize API configuration in `frontend/src/api/client.ts` with a required `VITE_API_URL` defaulting to `http://localhost:3001`; update `ApiProvider` and hooks to share the client and include error interceptors.
- ✅ Adjust mutation hooks in `frontend/src/api/hooks.ts` to send DTO-compliant payloads, invalidate relevant queries, and display success/error toasts.
- ✅ Update `JobWizardModal` to mirror backend validation (Zod schema matching DTO), convert date picker values to ISO strings before submission, and render field-level errors from API responses.
- ✅ Implement a delete confirmation dialog offering soft vs hard delete options, wire it to the delete mutation, and ensure archived jobs are hidden unless the user toggles a "Show archived" filter.
- ✅ Add a job history view (modal/drawer) backed by a new `useJobHistoryQuery` hook, displaying timeline data from `GET /jobs/:id/history`.

## Test Plan
- **Backend:** `npm run test -- jobs.service.spec.ts --runInBand` exercises creation (minimal + outreach/application), soft delete, hard delete, and conflict paths. (Full e2e suite still outstanding.)
- **Frontend:** `npx vitest run` covers the job wizard (success + validation error) and delete confirmation flow (soft + hard), plus existing dashboard/layout smoke tests.
- **Manual QA:** End-to-end verification in the running app—create/update/delete jobs, inspect network payloads for DTO parity, toggle archived jobs, and confirm heat/history updates.

## Rollback/Recovery
- Keep soft delete as default; if hard delete introduces issues, remove the query-param path and retain archived filtering.
- Document Prisma migration steps and provide rollback instructions (`npm run prisma:migrate` / revert migration) to restore the previous schema if necessary.
- If the new exception filter causes unexpected responses, disable it by deregistering in `backend/src/main.ts` to fall back to Nest defaults.

## Timeline & Owners
- Today – Finalize plan and align on DTO/service contract updates (single dev).
- Tomorrow – Implement backend DTO, service, delete flow, and exception handling (single dev).
- Day 3 – Land frontend payload alignment, hooks, UI polish, and toast/error handling (single dev).
- Day 4 – Add automated tests, run manual QA, and update verification docs (single dev).

## How to Verify
1. Backend: `cd backend && npm run test -- jobs.service.spec.ts` to exercise create/delete flows; spot-check with `curl` for `POST /jobs`, `DELETE /jobs/:id`, and `GET /jobs/:id/history` to confirm responses.
2. Frontend: `cd frontend && npm run test -- --run` to execute Vitest suites, then `npm run dev` to manually create/update/delete jobs and confirm toasts plus archived toggle behavior.
3. Observe backend logs for structured entries around job create/delete (requestId, status, error details) with no unhandled promise rejections.
