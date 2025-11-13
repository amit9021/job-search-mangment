---
id: chunk-backend-kpi
title: Backend · KPI API
module: backend-kpi
generated_at: 2025-11-09T09:43:23.366Z
tags: ["api","service"]
source_paths: ["backend/src/modules/kpi/kpi.controller.ts","backend/src/modules/kpi/kpi.service.ts"]
exports: ["KpiController","KpiService"]
imports: ["../../prisma/prisma.service","../../utils/dayjs","../recommendation/recommendation.service","./kpi.service","@nestjs/common"]
tokens_est: 553
---

### Summary
- Offers /kpis/today and /kpis/week endpoints for dashboard cards.
- Service aggregates Prisma stats with timezone-aware filters.

### Key API / Logic

### Operational Notes

**Invariants**
- KPI ranges default to the user timezone; keep TIMEZONE env in sync.
- Metrics rely on Prisma aggregations; ensure indexes exist when adding new ones.

**Failure modes**
- Invalid date ranges raise BadRequestException via DTO validation.
- Large time windows may cause slow Prisma scans without additional constraints.

**Extension tips**
- Add new KPI fields by extending dto outputs plus StatsService/TasksService feeders.
- Expose grouped metrics via dedicated DTOs rather than overloading existing endpoints.

#### backend/src/modules/kpi/kpi.controller.ts

```ts
export class KpiController {
  @Get('today')
    async today() {
      const [kpis, nextAction] = await Promise.all([
        this.kpiService.getToday(),
        this.recommendationService.getNextRecommendation()
      ]);
      return {
        ...kpis,
        nextBestAction: nextAction
      };
    }

  @Get('week')
    async week() {
      return this.kpiService.getWeek();
    }
}
```

#### backend/src/modules/kpi/kpi.service.ts

```ts
export class KpiService {
  async getToday() {
      const start = dayjs().startOf('day').toDate();
      const end = dayjs().endOf('day').toDate();
      const archivedJobStages = ['REJECTED', 'DORMANT'] as const;
  
      const jobActiveFilter = {
        OR: [
          { jobId: null },
          {
            job: {
              archived: false,
              stage: { notIn: [...archivedJobStages] }
            }
          }
        ]
      };
  
      const contactActiveFilter = {
        OR: [{ contactId: null }, { contact: { archived: false } }]
      };
  
      const [cvSentToday, outreachToday, followupsDue, seniorReviewsThisWeek, heatBreakdown] =
        await Promise.all([
          this.prisma.jobApplication.count({
            where: {
              dateSent: { gte: start, lte: end },
              job: {
                archived: false,
                stage: { notIn: [...archivedJobStages] }
              }
            }
          }),
          this.prisma.outreach.count({
            where: {
              sentAt: { gte: start, lte: end },
              ...jobActiveFilter,
              OR: [...contactActiveFilter.OR]
            }
          }),
          this.prisma.followUp.count({
            where: {
              dueAt: { gte: start, lte: end },
              sentAt: null,
              ...jobActiveFilter,
              OR: [...contactActiveFilter.OR]
            }
          }),
          this.countSeniorReviewsThisWeek(),
          this.prisma.job.groupBy({
            by: ['heat'],
            where: {
              archived: false,
              stage: { notIn: [...archivedJobStages] }
            },
            _count: { _all: true }
          })
        ]);
  
      return {
        cvSentToday,
        cvTarget: 5,
        outreachToday,
        outreachTarget: 5,
        followupsDue,
        seniorReviewsThisWeek,
        heatBreakdown: [0, 1, 2, 3].map((heat) => ({
          heat,
          count:
            (heatBreakdown.find((item) => item.heat === heat)?._count as { _all: number } | undefined)
              ?._all ?? 0
        }))
      };
    }

  async getWeek() {
      const start = dayjs().startOf('week').toDate();
      const end = dayjs().endOf('week').toDate();
      const archivedJobStages = ['REJECTED', 'DORMANT'] as const;
  
      const jobActiveFilter = {
        OR: [
          { jobId: null },
          {
            job: {
              archived: false,
              stage: { notIn: [...archivedJobStages] }
            }
          }
        ]
      };
  
      const contactActiveFilter = {
        OR: [{ contactId: null }, { contact: { archived: false } }]
      };
  
      const [
        cvSent,
        outreach,
        followupsSent,
        eventsAttendedLegacy,
        boostTasksDoneLegacy,
        eventsAttendedGrow,
        boostTasksCompletedGrow
      ] = await Promise.all([
        this.prisma.jobApplication.count({
          where: {
            dateSent: { gte: start, lte: end },
            job: {
              archived: false,
              stage: { notIn: [...archivedJobStages] }
            }
          }
        }),
        this.prisma.outreach.count({
          where: {
            sentAt: { gte: start, lte: end },
            ...jobActiveFilter,
            OR: [...contactActiveFilter.OR]
          }
        }),
        this.prisma.followUp.count({
          where: {
            sentAt: { gte: start, lte: end },
            ...jobActiveFilter,
            OR: [...contactActiveFilter.OR]
          }
        }),
        this.prisma.event.count({
          where: { status: 'ATTENDED', date: { gte: start, lte: end } }
        }),
        this.prisma.boostTask.count({
          where: { doneAt: { gte: start, lte: end } }
        }),
        this.prisma.growthEvent.count({
          where: { attended: true, date: { gte: start, lte: end } }
        }),
        this.prisma.growthBoostTask.count({
          where: {
            status: 'completed',
            compl
```

### Related
- [chunk-backend-stats](./chunk-backend-stats.md)
- [chunk-backend-dashboard](./chunk-backend-dashboard.md)
