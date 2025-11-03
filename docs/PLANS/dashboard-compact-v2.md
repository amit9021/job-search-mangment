# Dashboard Compact v2 — Plan

## Objectives & Constraints
- Deliver a “mission control” dashboard that fits entirely within a 1366×768 desktop viewport with no browser scrolling at ≥100% zoom.
- Present immediate actions (NBA, queue, notifications) alongside 7/14/30 day history and KPIs without sacrificing readability.
- Maintain existing backend schema; reuse Jobs/Contacts/Grow/Tasks services; add only lightweight aggregator/stat endpoints.
- Ensure keyboard accessibility (Enter/Space) and tooltip explainability across the compact layout.

## Layout Grid (Tailwind CSS, desktop-first)
Container: `max-w-screen-xl`, centered, `grid rows=[h-44,h-56,h-56]` with `grid-cols-12 gap-3`.

Row 1 (`h-44`):
- Columns 1–4: `<NextBestActionCompact />`
- Columns 5–8: `<KpiMiniTiles />` (4 mini KPI tiles with sparklines)
- Columns 9–12: `<TimeRangeSelector />` (segmented 7/14/30 day control)

Row 2 (`h-56`):
- Columns 1–6: `<ChartCvsSent />` (bar chart, last N days)
- Columns 7–12: `<ChartWarmOutreach />` (line chart, last N days)

Row 3 (`h-56`):
- Columns 1–4: `<ChartFollowupsPie />` (completed vs due/overdue)
- Columns 5–8: `<HeatBuckets />` (heat 0–3 with delta vs previous period)
- Columns 9–12: `<ActionBand />` (split card: TodayQueue left, Notifications right, each with `max-h-48` and custom scrollbar)

Internal cards manage their own overflow; outer page never scrolls vertically on desktop.

## Data Contracts
### `/dashboard/summary` (updated)
```json
{
  "kpis": {
    "tailoredCvs": { "sentToday": number, "targetDaily": number, "spark": number[] },
    "outreach": { "sentToday": number, "targetDaily": number, "spark": number[] },
    "followUpsDue": number,
    "seniorReviewsThisWeek": number
  },
  "nextBestAction": {
    "title": string,
    "reason": string,
    "suggestedAction": "follow_up" | "send_outreach" | "apply" | "review",
    "job": { "id": string, "company": string, "role": string, "heat": number } | null,
    "ctaLink": string
  },
  "notifications": [
    { "severity": "high" | "med" | "low", "text": string, "ctaLink": string | null }
  ],
  "todayQueue": [
    { "type": "follow_up" | "task" | "stale_outreach", "title": string, "dueAt": string | null, "ctaLink": string }
  ]
}
```

### `/stats/weekly-summary?range=7|14|30`
```json
{
  "range": 7,
  "series": {
    "cvsSent":       [{ "d": "2025-11-01", "v": 3 }, ...],
    "warmOutreach":  [{ "d": "2025-11-01", "v": 2 }, ...],
    "followupsDone": [{ "d": "2025-11-01", "v": 1 }, ...],
    "followupsDue":  [{ "d": "2025-11-01", "v": 2 }, ...]
  },
  "heat": {
    "h0": number,
    "h1": number,
    "h2": number,
    "h3": number,
    "delta": { "h0": number, "h1": number, "h2": number, "h3": number }
  }
}
```

## Design Tokens & Component Notes
- **Spacing:** global `gap-3`, card padding `p-4` (Row 1) / `p-5` (Rows 2/3).
- **Typography:** headings `text-sm font-semibold uppercase` for labels; numbers `text-2xl–3xl font-semibold`.
- **Color:** leverage Tailwind brand palette (`brand`, `slate`, `emerald`, `amber`, `rose`). Heat delta uses `text-emerald-600` (▲) / `text-rose-600` (▼).
- **Sparklines:** Recharts `LineChart` mini variant (`h-10 w-full`), monotone line, no axis, subtle gradient fill.
- **Charts:** reuse brand colors, tooltips with formatted dates (`MMM d`). Pie chart uses completed vs remaining slices.
- **ActionBand:** two-column flex, each `overflow-y-auto max-h-48`, custom scrollbar classes (`scrollbar-thin`).

## Acceptance Criteria & QA
- Dashboard renders without vertical scrollbars on ≥1366×768 desktop.
- Range selector (7/14/30) updates `/stats/weekly-summary` and rehydrates charts & KPI spark arrays consistently.
- Tiles, heat cards, NBA CTA, and ActionBand links navigate to filtered Jobs/Contacts/Tasks views.
- TodayQueue retains keyboard shortcuts (Enter/Space) and works inside ActionBand scroll area.
- Notifications sorted by severity; deltas display ▲/▼ based on heat differences.
- Skeletons per card; error toast on data fetch failure; auto-refresh 60s.
- Unit tests cover stats bucketing, heat delta math, and NBA logic; frontend Cypress smoke clicks heat bucket and verifies URL filters.
