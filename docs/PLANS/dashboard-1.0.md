# Dashboard v1.0 Plan

## 1. Goals & UX Pillars
- **Action-first:** Surface a deterministic “Next Best Action” (NBA) backed by job heat, follow-up gaps, and warm outreach prompts so the user always knows what to do next.
- **Explainable KPIs / Heat:** Every KPI tile and heat bucket exposes lightweight tooltips / contextual explanations (with deeper links to heat-explain) so the user can understand why the numbers matter.
- **Streak motivation:** Highlight task completion streaks, weekly progress, and daily target gaps to reinforce momentum and prevent backsliding.
- **Zero-state:** Provide uplifting calls-to-action (add a job, create warm outreach, set up boosts) whenever a section has no data, avoiding empty dashboards.

## 2. Data Aggregation Design (/dashboard/summary)
- **Single endpoint:** Implement `GET /dashboard/summary` in a new `DashboardModule`.
- **Fan-out pattern:** Invoke existing services in parallel using `Promise.allSettled` with a per-call timeout (1500 ms) and fallbacks:
  - `TasksService.getKpis()` for dueToday/overdue/velocity7d/streak.
  - `TasksService.list` (today/backlog) for actionable tasks.
  - `JobsService.list` (unarchived) for heat, stage, follow-up schedules, and linked contacts.
  - `FollowupsService.getDue('today'|'overdue')` for follow-up queue building.
  - `GrowService` helper for weekly counts (events/boosts/reviews).
  - `OutreachService` helper for stale (>48 h without outcome) outreach nudges.
- **Composition:** Merge the service outputs into a single DTO, computing:
  - Heat buckets (0–3) from job list.
  - Daily target progress using config defaults (env overrides).
  - Notifications (severity-ordered).
  - Weekly snapshot rollups for last 7 days.
  - NBA decision tree (rules below).
- **Graceful degradation:** If a sub-call fails or times out, log, return neutral defaults, and append a low-severity notification noting degraded data.
- **Caching:** Maintain a 15 s in-memory cache keyed by user id to limit downstream pressure while keeping data fresh; skip cache busting when query param `?force=true` is present (for future manual refresh).

## 3. JSON Contract (exact shape)
```json
{
  "kpis": {
    "tasks": { "dueToday": number, "overdue": number, "velocity7d": number, "streakDays": number },
    "tailoredCvs": { "sentToday": number, "dailyTarget": number },
    "outreach": { "warmSentToday": number, "dailyTarget": number },
    "followUpsDue": number,
    "seniorReviewsThisWeek": number
  },
  "heat": {
    "buckets": { "h0": number, "h1": number, "h2": number, "h3": number }
  },
  "nextBestAction": {
    "title": string,
    "reason": string,
    "suggestedAction": "follow_up" | "send_outreach" | "apply" | "review",
    "job": { "id": string, "company": string, "role": string, "heat": number } | null,
    "ctaLink": string
  },
  "todayQueue": [
    {
      "type": "follow_up" | "task" | "stale_outreach",
      "title": string,
      "dueAt": string | null,
      "context": { "jobId?": string, "contactId?": string },
      "ctaLink": string
    }
  ],
  "weeklySnapshot": {
    "cvsSent": number,
    "outreach": number,
    "followUpsCompleted": number,
    "eventsAttended": number,
    "boostTasksDone": number
  },
  "notifications": [
    { "severity": "high" | "med" | "low", "text": string, "ctaLink": string | null }
  ]
}
```

## 4. Components Tree & Routing
- **Route:** `/` remains the dashboard entry; guard with `DASHBOARD_V1` feature flag (fallback to legacy stack when false).
- **Page structure (`DashboardPage`):**
  1. `<NextBestActionCard />`
  2. `<KpiTiles />`
  3. `<PipelineHeatMap />`
  4. `<WeeklySnapshot />`
  5. `<NotificationsList />`
  6. `<TodayQueue />`
- **Supporting components (under `frontend/src/components/dashboard/`):**
  - `NextBestActionCard` – CTA and explanation tooltips.
  - `KpiTiles` – four KPI tiles with tooltip overlays and zero-states.
  - `PipelineHeatMap` – four buckets, click-through to `/jobs?heat=X`.
  - `WeeklySnapshot` – compact stat list with iconography.
  - `NotificationsList` – ordered nudges, includes degraded notice.
  - `TodayQueue` – actionable list with keyboard shortcuts (enter/space).
- **State/access:** `useDashboardSummary` React Query hook (cache 30 s, refetch 60 s) powering all child components; components receive derived view models only.

## 5. Performance & SLA
- **Server:** Aggregation target <300 ms (steady state); per-call timeout 1500 ms with short circuit defaults; memoize per-user summary for 15 s; expose `x-dashboard-cache: hit|miss` header for observability.
- **Client:** Show skeleton loaders (cards, list placeholders) while fetching; retry once on failure, then surface a toast; maintain query cache for 30 s and auto-refresh every 60 s.
- **Feature flag:** `DASHBOARD_V1` env (backend + frontend) toggles new route/controller; default `true`.

## 6. Acceptance Criteria & QA Checklist
- **Functional:**
  - `/dashboard/summary` returns the contract above and honours feature flag.
  - NBA follows rule order:
    1. Hottest jobs (heat 3→0) lacking follow-up in next 48 h.
    2. Medium heat jobs (>0) untouched for >3 days with linked contact.
    3. Otherwise prompt to create two warm outreaches.
  - Heat buckets sum to total active jobs; clicking a bucket filters `/jobs`.
  - Today queue combines overdue follow-ups, due-today follow-ups, overdue tasks, and stale outreach (>48 h no outcome) without duplicates.
  - Notifications sorted by severity: overdue follow-ups, due today, target gaps, stale outreach, degraded notice.
- **Resilience:**
  - Any downstream failure yields zeros/defaults, still 200 response, and emits a low-severity notification.
  - Cache invalidates on POST/PUT actions via provided `invalidate` hook (React Query).
- **UI/UX:**
  - Zero-state CTAs present for each empty section.
  - Tooltips available for KPIs and heat map.
  - Keyboard shortcuts work (Enter opens first queue item, Space toggles completion where applicable).
- **Testing:**
  - Backend unit tests cover heat bucket aggregation, NBA selection, target progress, notifications ordering.
  - Frontend unit tests validate hook data mapping + zero-state renders.
  - Cypress/Playwright smoke test validates tiles, zero-state, NBA display, and heat bucket navigation.
- **QA Pass:**
  - Manual verification checklist executed (KPIs, NBA reason, queue merge, notifications ordering, weekly snapshot accuracy, heat map navigation).
