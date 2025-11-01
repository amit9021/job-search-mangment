## Heat Badge Breakdown Refresh Plan

### 1. Summary
- Ensure the Heat tooltip always shows the latest score after create/update/delete actions.
- Extend the breakdown so each signal displays `current points / max points` plus descriptive copy.
- Align the backend computation with the documented algorithm so the tooltip matches the persisted heat value.

### 2. Current Gaps
- `HeatBadge` only refetches the explanation the first time the popover opens. After outreach deletion or other updates, the badge heat changes but the tooltip still shows stale score.
- Breakdown rows only show the computed value; there is no “max” context or consistent messaging per factor.
- Users expect the tooltip to explain every signal (stage base, referral/outreach/contact strength, personalization, tailoring, recency, clamp) with clear point attribution.

### 3. Implementation Tasks
1. **Tooltip Refresh**
   - Update `HeatBadge` so every popover open triggers a refetch (invalidate stale data), ensuring the score/heat matches current backend state.
2. **Backend Breakdown Enhancements**
   - Update `JobsService.computeHeatResult` to attach `maxValue` and richer `note` per breakdown item:
     - Stage base (baseline vs. cap)
     - Referral weight
     - Outcome/contact/channel contributions (with decay applied)
     - Personalization (score ÷ divisor, max = 100 ÷ divisor)
     - Tailoring (score ÷ divisor)
     - Recency factor (0–1)
     - Clamp adjustments
   - Ensure archived/default cases still return descriptive breakdown.
3. **Frontend Tooltip UI**
   - Render each breakdown row with `current / max` formatting and include the note text.
   - Highlight total score vs. heat level consistently.

### 4. Testing
- Backend unit specs for `computeHeatResult` to validate `maxValue` and notes, plus scenario covering outreach deletion.
- Frontend RTL test (or interaction test) asserting the tooltip refetches and displays updated values after heat affecting actions.
- Manual QA: create outreach → open tooltip; delete outreach → reopen tooltip, confirm score updates and breakdown rows show correct information.

### 5. Risks / Mitigations
- Additional refetches on every tooltip open increase network calls; mitigate by keeping payload small and limiting to user-triggered opens.
- Ensure new breakdown fields are backwards compatible for existing consumers (only `HeatBadge` currently uses them).
