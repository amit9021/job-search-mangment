---
id: chunk-backend-followups
title: Backend · Follow-ups API
module: backend-followups
generated_at: 2025-11-13T13:59:07.988Z
tags: ["api","service"]
source_paths: ["backend/src/modules/followups/followups.controller.ts","backend/src/modules/followups/followups.service.ts"]
exports: ["FollowupsController","FollowupsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/create-zod-dto","../../utils/dayjs","../notifications/notifications.service","./dto/create-followup.dto","./dto/get-followups.query","./dto/send-followup.dto","./dto/update-followup.dto","./followups.service","@nestjs/common","@prisma/client"]
tokens_est: 623
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

  @Post()
    async schedule(@Body() body: CreateFollowupDto) {
      return this.followupsService.scheduleCustomFollowup(body);
    }

  @Patch(':id/send')
    async markSent(@Param() params: IdParamDto, @Body() body: SendFollowupDto) {
      return this.followupsService.markSent(params.id, body.note);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateFollowupDto) {
      return this.followupsService.updateFollowup(params.id, body);
    }

  @Delete(':id')
    async delete(@Param() params: IdParamDto) {
      return this.followupsService.deleteFollowup(params.id);
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

  async createFollowup(
      params: FollowupContext & {
        attemptNo: 1 | 2;
        dueAt: Date;
        type?: FollowUpType;
        appointmentMode?: FollowUpAppointmentMode | null;
      }
    ) {
      return this.prisma.followUp.create({
        data: {
          jobId: params.jobId ?? null,
          contactId: params.contactId ?? null,
          note: params.note ?? null,
          attemptNo: params.attemptNo,
          dueAt: params.dueAt,
          type: params.type ?? FollowUpType.STANDARD,
          appointmentMode: params.appointmentMode ?? null
        }
      });
    }

  async scheduleCustomFollowup(data: InferDto<typeof CreateFollowupDto>) {
      const dueAt = new Date(data.dueAt);
      if (Number.isNaN(dueAt.getTime())) {
        throw new BadRequestException('Invalid due date');
      }
      const followup = await this.createFollowup({
        jobId: data.jobId,
        contactId: data.contactId,
        note: data.note ?? null,
        attemptNo: 1,
        dueAt,
        type: FollowUpType.APPOINTMENT,
        appointmentMode: data.appointmentMode ?? FollowUpAppointmentMode.MEETING
      });
      await this.syncAppointmentTask(followup.id);
      return followup;
    }

  async updateFollowup(id: string, data: InferDto<typeof UpdateFollowupDto>) {
      const followup = await this.prisma.followUp.findUnique({ where: { id } });
      if (!followup) {
        throw new NotFoundException('Follow-up not found');
      }
      if (followup.sentAt) {
        throw new BadRequestException('Completed follow-ups cannot be changed');
      }
      const update: {
        dueAt?: Date;
        note?: string | null;
        contactId?: string | null;
        appointmentMode?: FollowUpAppointmentMode | null;
      } = {};
      if (data.dueAt) {
        const dueAt = new Date(data.dueAt);
        if (Number.isNaN(dueAt.getTime())) {
          throw new BadRequestException('Invalid due date');
        }
        update.dueAt = dueAt;
      }
      if (typeof data.note !== 'undefined') {
        update.note = data.note ?? null;
      }
      if (typeof data.contactId !== 'undefined') {
        update.contactId = data.contactId ?? null;
      }
      if (typeof data.appointmentMode !== 'undefined') {
        update.appointmentMode = data.appointmentMode ?? null;
      }
      const updated = await this.prisma.followUp.update({
        wher
    /* ... truncated ... */

  async deleteFollowup(id: string) {
      const followup = await this.prisma.followUp.findUnique({ where: { id } });
      if (!followup) {
        throw new NotFoundException('Follow-up not found');
      }
      if (followup.sentAt) {
        throw new BadRequestException('Completed follow-ups cannot be deleted');
      }
      await this.prisma.followUp.delete({ where: { id } });
      if (followup.type === FollowUpType.APPOINTMENT) {
        await this.deleteAppointmentTask(followup.id);
      }
      return { deletedId: id };
    }

  async cancelOpenForContext(params: { jobId?: string; contactId?: string }) {
      if
```

### Related
- [chunk-backend-outreach](./chunk-backend-outreach.md)
- [chunk-backend-tasks](./chunk-backend-tasks.md)
