---
id: chunk-backend-followups
title: Backend · Follow-ups API
module: backend-followups
generated_at: 2025-11-09T09:09:06.471Z
tags: ["api","service"]
source_paths: ["backend/src/modules/followups/followups.controller.ts","backend/src/modules/followups/followups.service.ts"]
exports: ["FollowupsController","FollowupsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/dayjs","../notifications/notifications.service","./dto/get-followups.query","./dto/send-followup.dto","./followups.service","@nestjs/common"]
tokens_est: 492
---

### Summary
- Schedules follow-up reminders and exposes due/overdue buckets for action center.
- Service filters archived contacts/jobs and tracks attempt numbers.

### Key API / Logic

### Operational Notes

**Invariants**
- Each follow-up stores attempt numbers to keep outreach cadence predictable.
- Due date filters always return non-archived contacts/jobs.

**Failure modes**
- Marking a follow-up complete without a matching record throws NotFoundException.
- Timezone mistakes will shift dueAt comparisons; rely on shared dayjs config.

**Extension tips**
- Add new due buckets by updating FollowupsService getters and DTO enums.
- Any auto-generation logic should reuse TasksService to avoid duplicate reminders.

#### backend/src/modules/followups/followups.controller.ts

```ts
export class FollowupsController {
  @Get()
    async list(@Query() query: FollowupQueryDto) {
      return this.followupsService.getDue(query.due);
    }

  @Patch(':id/send')
    async markSent(@Param() params: IdParamDto, @Body() body: SendFollowupDto) {
      return this.followupsService.markSent(params.id, body.note);
    }
}
```

#### backend/src/modules/followups/followups.service.ts

```ts
export class FollowupsService {
  async getDue(filter: 'today' | 'overdue' | 'upcoming' = 'today') {
      const now = dayjs();
      const startOfDay = now.startOf('day').toDate();
      const endOfDay = now.endOf('day').toDate();
      let where;
      switch (filter) {
        case 'overdue':
          where = { dueAt: { lt: startOfDay }, sentAt: null };
          break;
        case 'upcoming':
          where = { dueAt: { gt: endOfDay }, sentAt: null };
          break;
        default:
          where = { dueAt: { gte: startOfDay, lte: endOfDay }, sentAt: null };
      }
      return this.prisma.followUp.findMany({
        where,
        orderBy: { dueAt: 'asc' },
        include: { job: true, contact: true }
      });
    }

  async scheduleInitialFollowup(context: FollowupContext) {
      return this.createFollowup({
        ...context,
        attemptNo: 1,
        dueAt: dayjs().add(3, 'day').toDate()
      });
    }

  async createFollowup(params: FollowupContext & { attemptNo: 1 | 2; dueAt: Date }) {
      return this.prisma.followUp.create({
        data: {
          jobId: params.jobId ?? null,
          contactId: params.contactId ?? null,
          note: params.note ?? null,
          attemptNo: params.attemptNo,
          dueAt: params.dueAt
        }
      });
    }

  async cancelOpenForContext(params: { jobId?: string; contactId?: string }) {
      if (!params.jobId && !params.contactId) {
        return { count: 0 };
      }
  
      return this.prisma.followUp.deleteMany({
        where: {
          sentAt: null,
          ...(params.jobId ? { jobId: params.jobId } : {}),
          ...(params.contactId ? { contactId: params.contactId } : {})
        }
      });
    }

  async markSent(id: string, note?: string) {
      const followup = await this.prisma.followUp.findUnique({ where: { id } });
      if (!followup) {
        throw new NotFoundException('Follow-up not found');
      }
  
      const updated = await this.prisma.followUp.update({
        where: { id },
        data: { sentAt: new Date(), note: note ?? followup.note }
      });
  
      if (followup.attemptNo === 1) {
        await this.createFollowup({
          jobId: followup.jobId ?? undefined,
          contactId: followup.contactId ?? undefined,
          attemptNo: 2,
          dueAt: dayjs().add(3, 'day').toDate()
        });
      } else if (followup.attemptNo === 2) {
        // Schedule dormancy check notification in 7 days
        await this.notificationsService.queueDormantCandidateCheck({
          jobId: followup.jobId ?? undefined,
          contactId: followup.contactId ?? undefined,
          dueAt: dayjs().add(7, 'day').toDate()
        });
      }
  
      return updated;
    }

  async markDormantForJob(jobId: string) {
      await this.prisma.followUp.updateMany({
        where: { jobId, sentAt: null },
        data: { note: 'Marked dormant' }
      });
    }
}
```

### Related
- [chunk-backend-outreach](./chunk-backend-outreach.md)
- [chunk-backend-tasks](./chunk-backend-tasks.md)
