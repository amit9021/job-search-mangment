---
id: chunk-backend-stats
title: Backend · Stats Service
module: backend-stats
generated_at: 2025-11-09T08:03:21.008Z
tags: ["api","service"]
source_paths: ["backend/src/modules/stats/stats.controller.ts","backend/src/modules/stats/stats.service.ts"]
exports: ["StatsController","StatsService"]
imports: ["../../prisma/prisma.service","../../utils/dayjs","./dto/stats-weekly.dto","./stats.service","@nestjs/common"]
tokens_est: 497
---

### Summary
- Provides /stats/weekly endpoint returning sparkline-ready series.
- Service builds aggregated metrics (CVs, outreach, follow-ups, heat) with degrade tracking.

### Key API / Logic

### Operational Notes

**Invariants**
- All queries are time-zone aware and normalized via shared dayjs instance.
- Weekly summaries clamp to allowed windows (7/14/30).

**Failure modes**
- Missing data returns zeroed StatsWeeklySummaryDto but still sets degraded flags.
- Misconfigured timezone will skew bucket boundaries and degrade insights.

**Extension tips**
- Use addSeries helper when layering new metrics so the frontend receives consistent shapes.
- Update tests/fixtures when introducing new data points.

#### backend/src/modules/stats/stats.controller.ts

```ts
export class StatsController {
  @Get('weekly-summary')
    async getWeeklySummary(@Query('range') range?: string): Promise<StatsWeeklySummaryDto> {
      const parsed = Number.parseInt(range ?? '', 10);
      return this.statsService.getWeeklySummary(Number.isFinite(parsed) ? parsed : 7);
    }
}
```

#### backend/src/modules/stats/stats.service.ts

```ts
export class StatsService {
  async getWeeklySummary(rangeInput: number): Promise<StatsWeeklySummaryDto> {
      const range = SUPPORTED_RANGES.has(rangeInput) ? rangeInput : 7;
      const end = this.now().endOf('day');
      const start = end
        .clone()
        .subtract(range - 1, 'day')
        .startOf('day');
      const prevEnd = start.clone().subtract(1, 'day').endOf('day');
      const prevStart = prevEnd
        .clone()
        .subtract(range - 1, 'day')
        .startOf('day');
  
      const days: string[] = [];
      const dayIndex = new Map<string, number>();
      for (let i = 0; i < range; i += 1) {
        const key = start.clone().add(i, 'day').format('YYYY-MM-DD');
        days.push(key);
        dayIndex.set(key, i);
      }
  
      const zeroSeries = (): StatsSeriesPoint[] => days.map((d) => ({ d, v: 0 }));
  
      const [
        applicationsResult,
        outreachResult,
        followupsDoneResult,
        followupsDueResult,
        heatNowResult,
        heatPrevResult
      ] = await Promise.all([
        this.callWithTimeout(() => this.fetchApplications(start, end), [] as Date[], 'applications'),
        this.callWithTimeout(() => this.fetchOutreach(start, end), [] as Date[], 'outreach'),
        this.callWithTimeout(
          () => this.fetchFollowupsDone(start, end),
          [] as Date[],
          'followups.done'
        ),
        this.callWithTimeout(() => this.fetchFollowupsDue(start, end), [] as Date[], 'followups.due'),
        this.callWithTimeout(
          () => this.fetchHeatCounts(end),
          [] as Array<{ heat: number; count: number }>,
          'heat.current'
        ),
        this.callWithTimeout(
          () => this.fetchHeatCounts(prevEnd, prevStart),
          [] as Array<{ heat: number; count: number }>,
          'heat.previous'
        )
      ]);
  
      const cvsSent = zeroSeries();
      const outreach = zeroSeries();
      const followupsDone = zeroSeries();
      const followupsDue = zeroSeries();
  
      const bump = (series: StatsSeriesPoint[], index: number, increment = 1) => {
        if (index >= 0 && index < series.length) {
          series[index].v += increment;
        }
      };
  
      const toKey = (value: Date) => dayjs(value).tz(this.timezone).format('YYYY-MM-DD');
  
      applicationsResult.value.forEach((date) => {
        const idx = dayIndex.get(toKey(date));
        if (idx !== undefined) {
          bump(cvsSent, idx);
        }
      });
  
      outreachResult.value.forEach((date) => {
        const idx = dayIndex.get(toKey(date));
        if (idx !== undefined) {
          bump(outreach, idx);
        }
      });
  
      followupsDoneResult.value.forEach((date) => {
        const idx = dayIndex.get(toKey(date));
        if (idx !== undefined) {
          bump(followupsDone, idx);
        }
      });
  
      followupsDueResult.value.forEach((date) => {
        const idx = dayIndex.get(toKey(date));
        if (idx !== undefined) {
          bump(followupsDue, idx);
        }
      });
  
      const heat = this.composeHeat(heatNowResult.value, heatPrevResult.value);
      const degraded =
        applicationsResult.degraded ||
        outreachResult.degraded ||
        followupsDoneResult.degraded ||
        followupsDueResult.degraded ||
        heatNowResult.degraded ||
        heatPrevResult.degraded;
  
      return {
        range,
        series: {
          cvsSent,
          warmOutreach: outreach,
          followupsDone,
          followupsDue
        },
        heat,
        degraded
      };
    }
}
```

### Related
- [chunk-backend-dashboard](./chunk-backend-dashboard.md)
- [chunk-backend-kpi](./chunk-backend-kpi.md)
