# Contacts UI/UX v1.2 Plan

## 1) Goals
- Add engagement heat indicator per contact with Cold/Warm/Hot visual badge that reflects outreach history.
- Improve Contact Drawer UX: inline editing, tag management, strength selector with color-coded options, and richer context tabs.
- Provide Link-to-Job flow including inline job creation so contacts can be associated with jobs without leaving the drawer.
- Allow Outreach & Follow-up actions directly from the drawer/timeline with quick composer and outcome updates.
- Polish filtering, search, accessibility, and general UX to make finding and acting on contacts faster.

## 2) Frontend scope
- `frontend/src/pages/Contacts/ContactsPage.tsx`: add engagement column, quick-add contact button, advanced filters (strength, tags, last touch).
- `frontend/src/components/contacts/ContactDrawer.tsx`: enable inline edits, tabs for Details/Timeline/Jobs, strength radios, autocomplete inputs.
- `frontend/src/components/dialogs/LinkToJobDialog.tsx`: implement dual-tab dialog (existing job selection + inline job creation) triggering outreach flow.
- `frontend/src/components/dialogs/AddOutreachDialog.tsx`: build outreach mini form capturing channel, message type, personalization, content, outcome.
- `frontend/src/components/contacts/Timeline.tsx` (or equivalent): group entries by week, show icons, inline outcome dropdown, new follow-up button.
- Ensure shared UI primitives (badges, buttons, inputs) align with design system; add small helper components when needed.

## 3) Backend scope
- Verify outreach module supports `POST /outreach` to link contact/job and return updated timeline data.
- Add/confirm `PATCH /outreach/:id` for outcome updates influencing contact heat.
- Provide helper `GET /contacts/:id/heat` or reuse existing heat calculation endpoint for engagement badge refresh.
- Avoid schema changes; reuse existing services and repositories wherever possible.

## 4) Docs updates
- `docs/CONTACTS_MODULE.md`: document engagement indicator, drawer workflows, outreach timeline updates, and new filtering options.
- `docs/JOBS_MODULE.md`: describe link-to-job interaction, inline job creation, and how outreach ties job + contact context.

## 5) Acceptance criteria
- Contacts table shows engagement badge, quick-add button, and improved filter controls that persist selections.
- Contact Drawer supports inline edits for key fields, autocomplete for company/tags, color-coded strength radios, and Details/Timeline/Jobs tabs.
- Link-to-Job dialog allows selecting existing jobs or creating a new one inline; success leads to outreach mini form without closing drawer.
- Outreach mini form posts data successfully, updates timeline grouping, refreshes contact heat badge, and enables inline outcome edits.
- Timeline displays grouped events with icons, supports outcome dropdown, and offers follow-up quick action.
- All new flows respond gracefully to loading/error states, meet accessibility basics (labels, focus, keyboard).
- Unit/lint/type checks pass; manual QA covers contact CRUD, job linking, outreach creation, outcome editing, and filtering.

## 6) Risks & mitigation
- **Heat calculation delays**: cache or refetch minimal data; surface loading state on badge.
- **Drawer complexity**: break into smaller subcomponents and reuse hooks to maintain performance.
- **Autocomplete data sources**: reuse existing query hooks; debounce requests to avoid rate issues.
- **State sync between timeline and list**: centralize mutations via React Query to keep badge/filter state consistent.
