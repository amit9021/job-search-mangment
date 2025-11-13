---
id: chunk-backend-notifications
title: Backend · Notifications API
module: backend-notifications
generated_at: 2025-11-13T11:35:30.183Z
tags: ["api","service"]
source_paths: ["backend/src/modules/notifications/notifications.controller.ts","backend/src/modules/notifications/notifications.service.ts"]
exports: ["NotificationsController","NotificationsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/dayjs","./dto/list-notifications.query","./notifications.service","@nestjs/common"]
tokens_est: 397
---

### Summary
- REST routes for listing/creating/dismissing lightweight notifications.
- Service wires notifications into dashboard alert surfaces.

### Key API / Logic

### Operational Notes

**Invariants**
- Notification kinds map directly to frontend badges; update enums in tandem.
- Due queries default to today; clients must request other windows explicitly.

**Failure modes**
- Sending without a job/contact association may fail DTO validation.
- Deleting already sent notifications returns NotFoundException.

**Extension tips**
- Add categorization by expanding Notification entity + DTO + React hooks.
- Prefer TTL indexes if volume grows (currently Prisma-managed).

#### backend/src/modules/notifications/notifications.controller.ts

```ts
export class NotificationsController {
  @Get()
    async list(@Query() query: ListNotificationsQueryDto) {
      return this.notificationsService.list(query.scope);
    }

  @Patch(':id/send')
    async markSent(@Param() params: IdParamDto) {
      return this.notificationsService.markSent(params.id);
    }
}
```

#### backend/src/modules/notifications/notifications.service.ts

```ts
export class NotificationsService {
  async list(filter: 'today' | 'upcoming' | 'overdue' = 'today') {
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
      return this.prisma.notification.findMany({
        where,
        orderBy: { dueAt: 'asc' }
      });
    }

  async createNotification(kind: string, message: string, dueAt: Date) {
      return this.prisma.notification.create({
        data: { kind, message, dueAt }
      });
    }

  async markSent(id: string) {
      return this.prisma.notification.update({
        where: { id },
        data: { sentAt: new Date() }
      });
    }

  async queueDormantCandidateCheck({ jobId, contactId, dueAt }: DormantCandidateParams) {
      const message = jobId
        ? `Review job ${jobId} for dormancy`
        : contactId
          ? `Review contact ${contactId} for dormancy`
          : 'Review dormant candidates';
      await this.prisma.notification.create({
        data: {
          kind: 'dormant_candidate',
          message,
          dueAt,
          jobId: jobId ?? null,
          contactId: contactId ?? null
        }
      });
    }

  async createDailyNudge(message: string, dueAt: Date) {
      await this.ensureNotification('daily_nudge', message, dueAt);
    }

  async ensureNotification(
      kind: string,
      message: string,
      dueAt: Date,
      extras?: { jobId?: string; contactId?: string }
    ) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          kind,
          message,
          dueAt
        }
      });
      if (!existing) {
        await this.prisma.notification.create({
          data: {
            kind,
            message,
            dueAt,
            jobId: extras?.jobId ?? null,
            contactId: extras?.contactId ?? null
          }
        });
      }
    }
}
```

### Related
- [chunk-backend-dashboard](./chunk-backend-dashboard.md)
- [chunk-backend-tasks](./chunk-backend-tasks.md)
