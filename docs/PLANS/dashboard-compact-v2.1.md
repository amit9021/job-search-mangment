## Dashboard Compact v2.1 Plan

### Objectives & Constraints
- Deliver a desktop-first dashboard that fits entirely within 1366×768 (no vertical page scroll; overflow hidden at page level).
- Provide immediate clarity on “what to do now” (NBA), “progress vs targets” (mini KPI tiles with sparklines), historical momentum (7/14/30-day charts), and pipeline heat/follow-up health.
- Maintain responsiveness down to 1024px with stacked rows while preserving no-scroll requirement on ≥1366px.
- Reuse existing backend modules; no Prisma schema changes; fan-out aggregation must keep ≤300 ms typical latency with graceful degradation.

### Layout Grid (Tailwind 12-column, fixed rows)
- Wrapper: `max-w-screen-xl mx-auto px-4 py-4 overflow-hidden`.
- Grid: `grid grid-cols-12 gap-3`.
- Row heights:
  - **Row 1 (h-28)**  
    - Columns 1–4: `<NextBestActionCompact />`  
    - Columns 5–10: `<KpiMiniTiles />` (4 tiles, equal width)  
    - Columns 11–12: `<TimeRangeSelector />`
  - **Row 2 (h-40)**  
    - Columns 1–6: `<ChartCvsSent />` (bar chart)  
    - Columns 7–12: `<ChartWarmOutreach />` (line chart)
  - **Row 3 (h-44)**  
    - Columns 1–4: `<InsightsMini />` → split 50/50 between `<FollowupsStatusMini />` ring and `<HeatCompact />` bar  
    - Columns 5–12: `<ActionCenterTabs />` (Queue | Notifications) with internal scroll `max-h-40 overflow-auto`

### Data Contracts
- **GET `/dashboard/summary`** (existing)  
  ```json
  {
    "kpis": {
      "tailoredCvs": { "sentToday": 0, "targetDaily": 5, "spark": [0,0,0,0,0,0,0] },
      "outreach":    { "sentToday": 0, "targetDaily": 5, "spark": [0,0,0,0,0,0,0] },
      "followUpsDue": 0,
      "seniorReviewsThisWeek": 0
    },
    "nextBestAction": { /* unchanged compact payload */ },
    "todayQueue": [ /* unchanged */ ],
    "notifications": [ /* unchanged */ ]
  }
  ```
- **GET `/stats/weekly-summary?range=7|14|30`**  
  ```json
  {
    "range": 7,
    "series": {
      "cvsSent":       [{"d":"2025-01-01","v":3}, ...],
      "warmOutreach":  [{"d":"2025-01-01","v":4}, ...],
      "followupsDone": [{"d":"2025-01-01","v":2}, ...],
      "followupsDue":  [{"d":"2025-01-01","v":1}, ...]
    },
    "heat": {
      "h0": 5, "h1": 8, "h2": 6, "h3": 3,
      "delta": { "h0": -1, "h1": 2, "h2": 0, "h3": -2 }
    },
    "degraded": false
  }
  ```
- Requirements: fill missing dates, compute deltas against immediately preceding equal range, apply 1500 ms per-call timeout and return zeros + `degraded: true` when any dependency fails.

### Acceptance Criteria & QA
- Page renders within `max-w-screen-xl`, body has no vertical scroll at ≥1366×768 / 100% zoom; verify via Cypress (scrollHeight == clientHeight).
- Time range selector (7/14/30) updates both charts and KPI sparklines; loading states show skeleton shimmer.
- NBA card presents title, single CTA, “Why this?” link; clicking CTA navigates to context; heat CTA opens job-specific route.
- KPI tiles show trend sparklines; reaching/exceeding targets triggers subtle highlight.
- InsightsMini displays follow-up ring (done vs due/overdue) and HeatCompact segments with ▲▼ deltas; clicking heat segments filters Jobs by heat.
- ActionCenterTabs: Queue tab default; Notifications tab accessible; lists show at most six items with internal scroll; keyboard shortcuts: Enter opens first Queue item, Space toggles completion when permitted.
- Degraded data banner appears when either API returns `degraded: true`.
- Unit tests cover stats delta/bucketing and NBA selection logic; frontend tests ensure components render and range toggling works.
