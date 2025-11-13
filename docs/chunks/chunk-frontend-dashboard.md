---
id: chunk-frontend-dashboard
title: Frontend · Dashboard Page
module: frontend-dashboard
generated_at: 2025-11-09T09:09:06.471Z
tags: ["ui"]
source_paths: ["frontend/src/pages/DashboardPage.tsx","frontend/src/components/dashboard/KpiMiniTiles.tsx","frontend/src/components/dashboard/ChartWarmOutreach.tsx","frontend/src/components/dashboard/ChartCvsSent.tsx","frontend/src/components/dashboard/NextBestActionCompact.tsx","frontend/src/components/dashboard/ActionCenterTabs.tsx","frontend/src/components/dashboard/InsightsMini.tsx","frontend/src/components/dashboard/ChartFollowupsPie.tsx"]
exports: ["ActionCenterTabs","ChartCvsSent","ChartFollowupsPie","ChartWarmOutreach","DashboardPage","InsightsMini","KpiMiniTiles","NextBestActionCompact"]
imports: ["../../api/useDashboard","../../api/useStats","../api/hooks","../api/useDashboard","../api/useStats","../components/FollowUpList","../components/KpiCard","../components/dashboard/ActionCenterTabs","../components/dashboard/ChartCvsSent","../components/dashboard/ChartWarmOutreach","../components/dashboard/InsightsMini","../components/dashboard/KpiMiniTiles","../components/dashboard/NextBestActionCompact","../components/dashboard/TimeRangeSelector","./FollowupsStatusMini","./HeatCompact","react","react-router-dom","recharts"]
tokens_est: 146
---

### Summary
- Composes mission-control grid plus KPI tiles, charts, action center, and legacy fallback.

### Key API / Logic

### Operational Notes

**Invariants**
- Range selector limited to 7/14/30; matches backend dashboard guard.
- Summary + stats hooks refetch in sync to keep degrade banner accurate.

**Failure modes**
- If summary hook errors, page renders “Dashboard unavailable” block instead of crashing.
- Missing meta data toggles degrade indicator incorrectly.

**Extension tips**
- Add new widgets by placing them inside the CSS grid and wiring new hooks/chunks.
- Legacy view should stay untouched unless V1 flag removed.

#### frontend/src/pages/DashboardPage.tsx

```ts

```

#### frontend/src/components/dashboard/KpiMiniTiles.tsx

```ts

```

#### frontend/src/components/dashboard/ChartWarmOutreach.tsx

```ts

```

#### frontend/src/components/dashboard/ChartCvsSent.tsx

```ts

```

#### frontend/src/components/dashboard/NextBestActionCompact.tsx

```ts

```

#### frontend/src/components/dashboard/ActionCenterTabs.tsx

```ts

```

#### frontend/src/components/dashboard/InsightsMini.tsx

```ts

```

#### frontend/src/components/dashboard/ChartFollowupsPie.tsx

```ts

```

### Related
- [chunk-frontend-api](./chunk-frontend-api.md)
