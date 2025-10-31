1) Summary
   - Remove "Deadline" from Job create/edit UI and DTOs.
   - Do not use deadline in heat calculation anymore.
   - Keep/add Heat v2 (0–100 score → 0–3 badge) using signals (referral, stage, outreach outcome, contact strength, channel, personalization, tailoring, recency).
   - Add first-class "Add Outreach" and "Edit Outcome" actions from both Job and Contact (not just “Link”).

2) Options for DB:
   - A) Keep `job.deadline` column nullable but unused (no recalc triggers).
   - B) Run a migration to drop column. (Default to A for speed; note B as future.)

3) Affected endpoints & payloads
   - Remove `deadline` from CreateJobDto/UpdateJobDto.
   - Re-run validation (Zod/class-validator).
   - Heat recalculation triggers: on outreach create/update, status change, referral create/remove, application create (tailoring score), archive toggle (NOT on deadline).
   - Add/ensure PATCH /outreach/:id supports editing `outcome`, `personalizationScore?`, `content?`.

4) UI/UX
   - Jobs Wizard/Edit: remove deadline field completely.
   - Jobs table untouched except it no longer displays deadline; if a column exists, hide/remove.
   - Add **Add Outreach** button on Job row + Job Drawer (choosing existing/new contact inline, then channel/messageType/personalization/content/outcome).
   - Contact Drawer: **Add Outreach** → pick existing Job or create new Job inline → same outreach form.
   - HeatBadge tooltip: show weighted breakdown; add endpoint /jobs/:id/heat-explain for diagnostics.

5) Acceptance Criteria
   - Create Job without deadline; no validation errors.
   - Heat no longer uses deadline; changes only with real signals.
   - From Job: Add Outreach (existing or new contact) → heat recalculates; Contacts(#)/Last touch update.
   - From Contact: Add Outreach to existing/new Job → heat recalculates on that Job; Contact timeline shows the outreach; outcome editable.
   - PATCH /outreach/:id updates outcome and triggers heat recalc.
   - Docs updated (JOBS_MODULE.md, CONTACTS_MODULE.md).

6) Tests
   - Backend e2e: POST /jobs (no deadline), POST /jobs/:id/outreach, PATCH /outreach/:id (outcome), POST /jobs/:id/status; GET /jobs/:id/heat-explain.
   - Frontend RTL: create job (no deadline), add outreach from Job, add outreach from Contact, edit outcome → heat badge changes.
