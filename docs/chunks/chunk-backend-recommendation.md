---
id: chunk-backend-recommendation
title: Backend · Recommendations API
module: backend-recommendation
generated_at: 2025-11-13T07:15:08.035Z
tags: ["api","service"]
source_paths: ["backend/src/modules/recommendation/recommendation.controller.ts","backend/src/modules/recommendation/recommendation.service.ts"]
exports: ["RecommendationController","RecommendationResult","RecommendationService"]
imports: ["../../prisma/prisma.service","../../utils/dayjs","./recommendation.service","@nestjs/common","@prisma/client"]
tokens_est: 336
---

### Summary
- Stores/resolves recommendation payloads shown as Next Best Actions.

### Key API / Logic

### Operational Notes

**Invariants**
- Payload stays as Json column; keep schemas documented in dto definitions.
- Resolved recommendations carry resolvedAt timestamps for auditing.

**Failure modes**
- Resolving already-resolved items is idempotent but still queries the DB.
- Large payloads (>1MB) will exceed Postgres limits; avoid dumping huge context.

**Extension tips**
- When adding new recommendation kinds, update DTO union + frontend cards.
- Prefer storing normalized references (jobId/contactId) inside payload for joins.

#### backend/src/modules/recommendation/recommendation.controller.ts

```ts
export class RecommendationController {
  @Get('next')
    async next() {
      const result = await this.recommendationService.getNextRecommendation();
      return {
        title: result.title,
        action: result.action,
        ref: result.ref
      };
    }
}
```

#### backend/src/modules/recommendation/recommendation.service.ts

```ts
export type RecommendationResult = {
  score: number;
  title: string;
  action: string;
  ref: Record<string, unknown>;
};

export class RecommendationService {
  async getNextRecommendation() {
      const [
        jobs,
        followupsDue,
        cvToday,
        outreachToday,
        contactsWithReferrals,
        pendingReviews,
        eventsToday,
        openBoosts
      ] = await Promise.all([
        this.prisma.job.findMany({
          where: { stage: { notIn: [JobStage.REJECTED, JobStage.DORMANT] } },
          include: { outreaches: { orderBy: { sentAt: 'desc' }, take: 1 } }
        }),
        this.getDueFollowupsCount(),
        this.getCvSentToday(),
        this.getOutreachToday(),
        this.prisma.contact.count({
          where: {
            referrals: { some: {} }
          }
        }),
        this.prisma.codeReview.findMany({
          where: { reviewedAt: null },
          include: { project: true, contact: true }
        }),
        this.prisma.event.findMany({
          where: {
            date: {
              gte: dayjs().startOf('day').toDate(),
              lte: dayjs().endOf('day').toDate()
            }
          }
        }),
        this.prisma.boostTask.findMany({ where: { doneAt: null }, orderBy: { impactScore: 'desc' } })
      ]);
  
      const jobSuggestion = this.computeJobSuggestion(jobs, followupsDue, cvToday, outreachToday);
      const networkingSuggestion = this.computeNetworkingSuggestion(
        contactsWithReferrals,
        followupsDue
      );
      const growthSuggestion = this.computeGrowthSuggestion({
        cvToday,
        outreachToday,
        pendingReviews,
        eventsToday,
        openBoosts
      });
  
      const suggestions = [jobSuggestion, networkingSuggestion, growthSuggestion].filter(
        Boolean
      ) as RecommendationResult[];
      if (suggestions.length === 0) {
        return {
          title: 'Great job!',
          action: 'Maintain momentum with a quick win task.',
          ref: {},
          score: 0
        };
      }
      suggestions.sort((a, b) => b.score - a.score);
      return suggestions[0];
    }
}
```

### Related
- [chunk-backend-dashboard](./chunk-backend-dashboard.md)
