## Job Card Hover & Interaction Improvements Plan

### 1. Summary / Objectives
- Prevent the hover action menu (Edit / History / Add outreach / Delete) from covering the Heat badge so the tooltip remains accessible.
- Replace redundant “Updated X ago / Last touch X ago” messaging with more informative status context.
- Introduce a click-to-open job actions modal that consolidates edit/history/outreach/delete options in one place, reducing hover dependencies.

### 2. Current Behaviour & Pain Points
- Jobs pipeline cards display the action menu at top-right on hover; the menu’s absolute positioning obscures the Heat badge, making the new heat breakdown tooltip unusable.
- Cards show both `updatedAt` and `lastTouchAt`, which are often identical. Users would benefit more from meaningful status hints (e.g., current stage + next follow-up).
- Users must hover precisely to access different actions; there is no consolidated dialog to navigate between edit/history/outreach/delete via clicks.

### 3. Proposed Changes
1. **Heat Badge Accessibility**
   - Adjust pipeline card layout/CSS so the action controls do not overlap the badge (e.g., move actions to bottom or offset top-right container).
   - Ensure HeatBadge remains clickable with tooltip on both cards and table rows.

2. **Card Info Refresh**
   - Replace redundant timestamps with a concise status row:
     - e.g., “Stage: TECH • Last touch 2d ago • Next follow-up in 3d”.
   - If follow-up data missing, show fallback (“No follow-ups scheduled”).
   - Use consistent formatting with existing `formatFollowUpCountdown`.

3. **Unified Job Actions Modal**
   - On click of a pipeline card (or dedicated “Open” button), launch a modal/dialog with tabs:
     - Details (edit fields or open existing JobWizardModal in edit mode),
     - History timeline (existing modal),
     - Outreach (launch AddOutreachDialog inside),
     - Danger zone for delete/archive.
   - Keep quick hover buttons for power users, but allow click-based navigation that doesn’t require hovering.
   - Update JobsPage state management to handle modal open/close; reuse existing components where possible.

### 4. Implementation Tasks
- [ ] Update `JobsPage` card layout to reposition action buttons and maintain heat badge visibility.
- [ ] Tweak status copy in cards (and optionally table) to show stage/last touch/next follow-up summary.
- [ ] Introduce a new `JobActionsModal` (or adapt the existing history modal) with tabs for Edit / History / Outreach / Delete.
  - Integrate existing `JobWizardModal` (edit), `JobHistoryModal`, `AddOutreachDialog`, delete confirmation.
  - Ensure cache updates after actions remain intact.
- [ ] Remove redundant “Updated X ago” display and adjust tests/snapshots.

### 5. Testing & Validation
- Update/extend JobsPage RTL tests to cover:
  - Heat badge remains accessible (e.g., tooltip visible upon hover).
  - Modal opens on card click and tabs render expected components.
  - Status row renders stage/last touch/follow-up correctly.
- Manual QA:
  - Hover cards → heat tooltip accessible.
  - Click card → modal opens; navigate between tabs; perform edit/outreach/delete flows.
  - Confirm follow-up text and stage info accurate for active/dormant jobs.

### 6. Risks / Mitigations
- Introducing new modal may duplicate functionality; mitigate by reusing existing components and ensuring caches invalidate once.
- Hover and click behaviours must coexist; ensure keyboard accessibility remains acceptable.
- CSS changes should be tested on different screen widths to avoid layout regressions.
