---
id: chunk-backend-outreach
title: Backend · Outreach API
module: backend-outreach
generated_at: 2025-11-13T11:35:30.183Z
tags: ["api","service"]
source_paths: ["backend/src/modules/outreach/outreach.controller.ts","backend/src/modules/outreach/outreach.service.ts"]
exports: ["OutreachController","OutreachService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/dayjs","../followups/followups.service","../jobs/jobs.service","../tasks/tasks.service","./dto/create-outreach.dto","./dto/list-outreach.query","./dto/update-outreach.dto","./outreach.service","@nestjs/common","@prisma/client"]
tokens_est: 583
---

### Summary
- Records outreach attempts, personalization scores, and outcomes under /outreach.
- Provides stale outreach queries feeding the dashboard follow-up queue.

### Key API / Logic

### Operational Notes

**Invariants**
- Channel and outcome enums must match the Prisma schema and frontend selects.
- Stale lookups rely on sentAt timestamps; ensure timezone handling uses dayjs helpers.

**Failure modes**
- Missing contact/job references raise NotFoundException before writes.
- High personalization scores without matching enums will fail DTO validation.

**Extension tips**
- Add new channels/outcomes by updating Prisma enums, DTO zod schemas, and frontend constants.
- Keep OutreachService.findStaleWithoutOutcome aligned with dashboard expectations.

#### backend/src/modules/outreach/outreach.controller.ts

```ts
export class OutreachController {
  @Get()
    async list(@Query() query: ListOutreachQueryDto) {
      return this.outreachService.list(query);
    }

  @Post()
    async create(@Body() body: CreateOutreachDto) {
      const { jobId, ...rest } = body as CreateOutreachInput;
      return this.jobsService.recordJobOutreach(jobId, rest);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateOutreachDto) {
      const result = await this.outreachService.update(params.id, body);
      if ('job' in result && result.job?.id) {
        await this.jobsService.recalculateHeat(result.job.id);
      }
      return result;
    }

  @Delete(':id')
    async remove(@Param() params: IdParamDto) {
      const result = await this.outreachService.delete(params.id);
      if (result.jobId) {
        await this.jobsService.recalculateHeat(result.jobId);
      }
      return {
        deletedId: result.id,
        jobId: result.jobId,
        contactId: result.contactId
      };
    }
}
```

#### backend/src/modules/outreach/outreach.service.ts

```ts
export class OutreachService {
  async createJobOutreach(jobId: string, payload: OutreachInput) {
      const job = await this.prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException('Job not found');
      }
  
      const personalizationScore =
        payload.personalizationScore !== undefined ? Math.round(payload.personalizationScore) : 70;
      const channel =
        typeof payload.channel === 'string'
          ? (payload.channel.toUpperCase() as OutreachChannel)
          : payload.channel;
  
      const outreach = await this.prisma.outreach.create({
        data: {
          jobId,
          contactId: payload.contactId ?? null,
          channel,
          messageType: payload.messageType,
          personalizationScore,
          outcome: payload.outcome ?? OutreachOutcome.NONE,
          content: payload.content ?? null,
          context:
            typeof payload.context === 'string'
              ? (payload.context.toUpperCase() as OutreachContext)
              : (payload.context ?? OutreachContext.OTHER)
        },
        include: { contact: true }
      });
  
      if (payload.createFollowUp !== false) {
        await this.followupsService.createFollowup({
          jobId,
          contactId: payload.contactId,
          attemptNo: 1,
          dueAt: dayjs(outreach.sentAt).add(3, 'day').toDate(),
          note: payload.followUpNote
        });
      }
  
      await this.tasksService.handleOutreachAutomation({
        outreachId: outreach.id,
        jobId,
        contactId: payload.contactId,
        outcome: payload.outcome ?? OutreachOutcome.NONE
      });
  
      await this.handleOutcomeEffects(outreach.contactId, payload.outcome);
      return outreach;
    }

  async createContactOutreach(contactId: string, payload: OutreachInput) {
      const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
  
      const personalizationScore =
        payload.personalizationScore !== undefined ? Math.round(payload.personalizationScore) : 70;
      const channel =
        typeof payload.channel === 'string'
          ? (payload.channel.toUpperCase() as OutreachChannel)
          : payload.channel;
  
      const outreach = await this.prisma.outreach.create({
        data: {
          contactId,
          jobId: null,
          channel,
          messageType: payload.messageType,
          personalizationScore,
          outcome: payload.outcome ?? OutreachOutcome.NONE,
          content: payload.content ?? null,
          context:
            typeof payload.context === 'string'
              ? (payload.context.toUpperCase() as OutreachContext)
              : (payload.context ?? OutreachContext.OTHER)
        }
      });
  
      if (payload.createFollowUp !== false) {
        await this.followupsService.createFollowup({
          contactId,
          attemptNo: 1,
          dueAt: dayjs(outreach.sentAt).add(3, 'day').toDate(),
          note: payload.followUpNote
        });
      }
  
      await this.tasksService.handleOutreachAutomation({
        outreachId: outreach.id,
        contactId,
        outcome: payload.outcome ?? OutreachOutcome.NONE
      });
  
      await this.handleOutcomeEffects(contactId, payload.outcome);
      return outreach;
    }

  async list(filter: { jobId?: string; contactId?: string }) {
      return this.prisma.outreach.findMany({
        where: {
          ...(filter.jobId ? { jobId: filter.jobId } : {}),
          ...(filter.contactId ? { contactId: filter.contactId } : {})
        },
        orderBy: { sentAt: 'desc' },
        include: { job: true, contact: true }
      });
    }

  async update(id: string, payload: PayloadUpdate) {
      const outreach = await this.prisma.outreach.findUnique({ where: { id } });
      if (!outreach) {
        return { id, jobId: null, contactId: null };
      }
  
      const u
```

### Related
- [chunk-backend-followups](./chunk-backend-followups.md)
- [chunk-backend-jobs](./chunk-backend-jobs.md)
