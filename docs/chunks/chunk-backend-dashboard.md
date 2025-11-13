---
id: chunk-backend-dashboard
title: Backend · Dashboard Aggregator
module: backend-dashboard
generated_at: 2025-11-09T09:43:23.366Z
tags: ["api","service","cache"]
source_paths: ["backend/src/modules/dashboard/dashboard.controller.ts","backend/src/modules/dashboard/dashboard.service.ts"]
exports: ["DashboardController","DashboardService"]
imports: ["../../common/decorators/user.decorator","../../utils/dayjs","../followups/followups.service","../jobs/jobs.service","../kpi/kpi.service","../outreach/outreach.service","../stats/dto/stats-weekly.dto","../stats/stats.service","../tasks/tasks.service","./dashboard.service","./dto/dashboard-summary.dto","@nestjs/common","@nestjs/config","express"]
tokens_est: 585
---

### Summary
- GET /dashboard/summary fetches KPI/tasks/outreach/stats in parallel with caching.
- Service orchestrates seven downstream modules and exposes degraded/cache headers.

### Key API / Logic

### Operational Notes

**Invariants**
- Accepted range values are limited to 7/14/30 days and sanitized server-side.
- Cache entries expire according to app.dashboard.cacheTtlSeconds.

**Failure modes**
- Downstream service timeouts flip the degraded flag but still deliver partial data.
- Dashboard feature flag false => controller returns 404 to hide the module.

**Extension tips**
- Use callWithTimeout helper when adding new dependencies to keep degraded semantics consistent.
- Remember to update DTOs when adding new queue/notification payloads.

#### backend/src/modules/dashboard/dashboard.controller.ts

```ts
export class DashboardController {
  @Get('summary')
    async getSummary(
      @CurrentUser() user: { id?: string } | null,
      @Query('force') force?: string,
      @Query('range') range?: string,
      @Res({ passthrough: true }) res?: Response
    ): Promise<DashboardSummaryDto> {
      const enabled = this.configService.get<boolean>('app.featureFlags.dashboardV1', true);
      if (!enabled) {
        throw new NotFoundException('Dashboard is currently disabled.');
      }
  
      const forceRefresh =
        typeof force === 'string' && ['1', 'true', 'yes', 'force'].includes(force.toLowerCase());
  
      const parsedRange = Number.parseInt(range ?? '', 10);
      const result = await this.dashboardService.getSummary(user?.id, {
        force: forceRefresh,
        range: Number.isFinite(parsedRange) ? parsedRange : undefined
      });
  
      if (res) {
        res.setHeader('x-dashboard-cache', result.cacheHit ? 'hit' : 'miss');
        res.setHeader('x-dashboard-degraded', result.degraded ? 'true' : 'false');
      }
  
      return result.payload;
    }
}
```

#### backend/src/modules/dashboard/dashboard.service.ts

```ts
export class DashboardService {
  async getSummary(
      userId?: string | null,
      options: { force?: boolean; range?: number } = {}
    ): Promise<DashboardSummaryWithMeta> {
      const config = this.getDashboardConfig();
      const acceptedRange = new Set([7, 14, 30]);
      const requestedRange = options.range ?? 7;
      const range = acceptedRange.has(requestedRange) ? requestedRange : 7;
      const cacheKey = `${userId ?? 'anonymous'}:${range}`;
      const now = Date.now();
  
      if (!options.force) {
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          return { payload: cached.payload, degraded: cached.degraded, cacheHit: true };
        }
      }
  
      const defaultStats = this.createEmptyStats(range);
  
      const [
        kpiTodayResult,
        jobsResult,
        actionableTasksResult,
        followupsTodayResult,
        followupsOverdueResult,
        staleOutreachResult,
        statsSummaryResult
      ] = await Promise.all([
        this.callWithTimeout(
          () => this.kpiService.getToday(),
          {
            cvSentToday: 0,
            cvTarget: config.dailyTargetCv,
            outreachToday: 0,
            outreachTarget: config.dailyTargetWarm,
            followupsDue: 0,
            seniorReviewsThisWeek: 0,
            heatBreakdown: []
          },
          'kpi.today'
        ),
        this.callWithTimeout(
          () => this.jobsService.list({ includeArchived: false }),
          [] as JobListItem[],
          'jobs.list'
        ),
        this.callWithTimeout(
          () => this.tasksService.getActionableTasks(),
          DEFAULT_ACTIONABLE_TASKS,
          'tasks.actionable'
        ),
        this.callWithTimeout(
          () => this.followupsService.getDue('today'),
          [] as FollowupItem[],
          'followups.today'
        ),
        this.callWithTimeout(
          () => this.followupsService.getDue('overdue'),
          [] as FollowupItem[],
          'followups.overdue'
        ),
        this.callWithTimeout(
          () => this.outreachService.findStaleWithoutOutcome(48),
          [] as StaleOutreachList,
          'outreach.stale'
        ),
        this.callWithTimeout(
          () => this.statsService.getWeeklySummary(range),
          defaultStats,
          'stats.weekly'
        )
      ]);
  
      const degraded =
        kpiTodayResult.degraded ||
        jobsResult.degraded ||
        actionableTasksResult.degraded ||
        followupsTodayResult.degraded ||
        followupsOverdueResult.degraded ||
        staleOutreachResult.degraded ||
        statsSummaryResult.degraded;
  
      const kpiToday = kpiTodayResult.value;
      const jobs = jobsResult.value;
      const actionableTasks = actionableTasksResult.value;
      const followupsTodayRaw = followupsTodayResult.value;
      const followupsOverdueRaw = followupsOverdueResult.value;
      const staleOutreachRaw = staleOutreachResult.value;
      const statsSummary = statsSummaryResult.value;
  
      const filterFollowup = (followup: FollowupItem) => {
        const job = followup.job as
          | (FollowupItem['job'] & { archived?: boolean; stage?: string })
          | undefined;
        if (job && (job.archived || (job.stage && ARCHIVED_JOB_STAGES.has(job.stage)))) {
          return false;
        }
        const contact = followup.contact as
          | (FollowupItem['contact'] & { archived?: boolean })
          | undefined;
        if (contact && contact.archived) {
          return false;
        }
        return true;
      };
  
      const followupsToday = followupsTodayRaw.filter(filterFollowup);
      const followupsOverdue = followupsOverdueRaw.filter(filterFollowup);
      const overdueFollowupIds = new Set(followupsOverdue.map((item) => item.id));
  
      const staleOutreach = staleOutreachRaw.filter((entry) => {
        const job = entry.job as
          | (typeof entry.job & { archived?: boolean; stag
```

### Related
- [chunk-backend-kpi](./chunk-backend-kpi.md)
- [chunk-backend-tasks](./chunk-backend-tasks.md)
- [chunk-backend-stats](./chunk-backend-stats.md)
- [chunk-backend-outreach](./chunk-backend-outreach.md)
