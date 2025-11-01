# Jobs UI/UX Overhaul Plan

## 1) Goals
- Add KPI header (Active jobs, Hot jobs, Follow-ups due today, Avg heat).
- Enhance pipeline cards: color by heat, mini progress bar, next follow-up bubble, clearer hierarchy.
- Upgrade HeatBadge: color scale (0=gray, 1=yellow, 2=orange, 3=red) + tooltip using GET /jobs/:id/heat-explain.
- Redesign Timeline: grouped by day, with icons & colored chips (outreach/follow-up/status/application), inline outcome editor.
- Refresh “Job actions” modal: clear order, icons, quick summary line.
- Keep/add quick actions on cards/rows: Edit, History, Add outreach, Delete/Archive.
- Non-goals: changing core data models.

## 2) Affected code (front)
- pages/JobsPage.tsx
- components/HeatBadge.tsx
- components/JobHistoryModal.tsx
- components/JobWizardModal.tsx
- components/AddOutreachDialog.tsx
- (optional) components/KpiHeader.tsx, components/TimelineIcon.tsx

## 3) Affected code (back)
- None functionally (reuse existing endpoints); ensure GET /jobs/:id/heat-explain is consumed for tooltip and Jobs list includes lastTouch/nextFollowUp/contactsCount.

## 4) Acceptance criteria
- KPI header shows counts and average heat; updates with query invalidation.
- Pipeline card shows: company (prominent), role, stage, HeatBadge, last touch, next follow-up bubble, contact chips, mini progress (Applied→Offer).
- Timeline renders icons/colors; inline outcome change persists and refreshes heat.
- Job actions modal shows: View history, Add outreach, Edit details, Delete/Archive (with icons and a compact summary).
- HeatBadge tooltip shows weighted breakdown and refreshes on open.
- No regressions: Add outreach, Update stage, History all still work.
