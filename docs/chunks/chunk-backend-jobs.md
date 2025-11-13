---
id: chunk-backend-jobs
title: Backend · Jobs Controller & Service
module: backend-jobs
generated_at: 2025-11-13T11:35:30.183Z
tags: ["api","service","db"]
source_paths: ["backend/src/modules/jobs/jobs.controller.ts","backend/src/modules/jobs/jobs.service.ts"]
exports: ["JobsController","JobsService"]
imports: ["../../common/decorators/user.decorator","../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/create-zod-dto","../contacts/contacts.service","../followups/followups.service","../outreach/outreach.service","./dto","./dto/create-job-outreach.dto","./heat-rules.loader","./jobs.service","@nestjs/common","@prisma/client"]
tokens_est: 795
---

### Summary
- Handles job pipeline CRUD plus stage/heat automation under /jobs.
- Service composes Contacts/Followups/Outreach services to compute linked metrics.
- Includes outreach/application helper DTOs for initial job bootstrap.

### Key API / Logic

### Operational Notes

**Invariants**
- Every create/update records stage history and recalculates heat rules.
- Heat computation depends on shared rules loaded via heat-rules.loader.

**Failure modes**
- Conflicting applications/outreach updates raise ConflictException.
- Missing job IDs bubble up as NotFoundException; archived jobs are skipped by default.

**Extension tips**
- Add new pipeline stages only after updating the Prisma enum, heat rules, and DTOs.
- Wrap multi-step mutations inside Prisma transactions to keep counts consistent.

#### backend/src/modules/jobs/jobs.controller.ts

```ts
export class JobsController {
  @Get()
    async list(@Query() query: ListJobsQueryDto) {
      return this.jobsService.list({
        stage: query.stage,
        heat: query.heat,
        includeArchived: query.includeArchived,
        query: query.query,
        page: query.page,
        pageSize: query.pageSize
      });
    }

  @Get(':id')
    async getById(@Param() params: IdParamDto) {
      return this.jobsService.getById(params.id);
    }

  @Post()
    async create(@Body() body: CreateJobDto) {
      return this.jobsService.create(body);
    }

  @Post(':id/notes')
    async addNote(
      @Param() params: IdParamDto,
      @Body() body: CreateJobNoteDto,
      @CurrentUser() user?: { id?: string | null }
    ) {
      return this.jobsService.addNote(params.id, body, user?.id ?? undefined);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateJobDto) {
      return this.jobsService.update(params.id, body);
    }

  @Patch(':id/notes/:noteId')
    async updateNote(
      @Param() params: IdParamDto,
      @Param('noteId') noteId: string,
      @Body() body: UpdateJobNoteDto
    ) {
      return this.jobsService.updateNote(params.id, noteId, body);
    }

  @Delete(':id')
    async delete(@Param() params: IdParamDto, @Query('hard') hard?: string) {
      const hardDelete =
        typeof hard === 'string' ? ['true', '1', 'yes', 'on'].includes(hard.toLowerCase()) : false;
      return this.jobsService.delete(params.id, { hard: hardDelete });
    }

  @Delete(':id/notes/:noteId')
    async deleteNote(@Param() params: IdParamDto, @Param('noteId') noteId: string) {
      return this.jobsService.deleteNote(params.id, noteId);
    }

  @Post(':id/applications')
    async addApplication(@Param() params: IdParamDto, @Body() body: AddApplicationDto) {
      return this.jobsService.addApplication(params.id, body);
    }

  @Post(':id/status')
    async updateStatus(@Param() params: IdParamDto, @Body() body: UpdateJobStageDto) {
      return this.jobsService.updateStatus(params.id, body);
    }

  @Post(':id/outreach')
    async addOutreach(@Param() params: IdParamDto, @Body() body: CreateJobOutreachDto) {
      return this.jobsService.recordJobOutreach(params.id, body);
    }

  @Get(':id/heat-explain')
    async heatExplain(@Param() params: IdParamDto) {
      return this.jobsService.getHeatExplanation(params.id);
    }

  @Get(':id/history')
    async history(@Param() params: IdParamDto) {
      return this.jobsService.getHistory(params.id);
    }
}
```

#### backend/src/modules/jobs/jobs.service.ts

```ts
export class JobsService {
  async list(
      filters: {
        stage?: JobStage;
        heat?: number;
        includeArchived?: boolean;
        query?: string;
        page?: number;
        pageSize?: number;
      } = {}
    ) {
      const { stage, heat, includeArchived, query, page, pageSize } = filters;
  
      const where: Prisma.JobWhereInput = {
        ...(includeArchived ? {} : { archived: false })
      };
  
      if (stage) {
        where.stage = stage;
      }
  
      if (heat !== undefined) {
        where.heat = heat;
      }
  
      if (query && query.trim().length > 0) {
        const term = query.trim();
        where.OR = [
          { company: { contains: term, mode: 'insensitive' } },
          { role: { conta
    /* ... truncated ... */

  async getById(jobId: string) {
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        include: {
          companyRef: true // Use the relation field, not the scalar 'company' field
        }
      });
      if (!job) {
        throw new NotFoundException('Job not found');
      }
      const metrics = await this.computeJobMetrics([job.id]);
      const metric = metrics.get(job.id);
      return {
        ...job,
        contactsCount: metric?.contactsCount ?? 0,
        contacts: metric?.contacts ?? [],
        nextFollowUpAt: metric?.nextFollowUpAt ?? null
      };
    }

  async create(data: InferDto<typeof CreateJobDto>) {
      const createdJob = await this.prisma.$transaction(async (tx) => {
        const stage = data.stage ?? JobStage.APPLIED;
        const initialApplicationSentAt = data.initialApplication
          ? data.initialApplication.dateSent
            ? new Date(data.initialApplication.dateSent)
            : new Date()
          : null;
        const job = await tx.job.create({
          data: {
            company: data.company,
            role: data.role,
            sourceUrl: data.sourceUrl ?? null,
            heat: data.heat ?? 0,
            stage,
            ...(initialApplicationSentAt ? { lastTouchAt: initialApplicationSentAt }
    /* ... truncated ... */

  async update(
      jobId: string,
      data: {
        company?: string;
        role?: string;
        sourceUrl?: string | null;
        companyId?: string | null;
      }
    ) {
      await this.ensureJobExists(jobId);
  
      const job = await this.prisma.job.update({
        where: { id: jobId },
        data: {
          ...(data.company !== undefined && { company: data.company }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
          ...(data.companyId !== undefined && { companyId: data.companyId }),
          updatedAt: new Date()
        }
      });
  
      return job;
    }

  async delete(jobId: string, options: { hard?: boolean } = {}) {
      await this.ensureJobExists(jobId);
  
      if (!options.hard) {
        await this.prisma.$transaction(async (tx) => {
          await tx.job.update({
            where: { id: jobId },
            data: {
              stage: JobStage.DORMANT,
              archived: true,
              archivedAt: new Date()
            }
          });
  
          await tx.jobStatusHistory.create({
            data: {
              jobId,
              stage: JobStage.DORMANT,
              note: 'Job archived'
            }
          });
        });
  
        await this.followupsService.markDormantForJob(jobId);
        await this.recalculateHeat(j
    /* ... truncated ... */

  async addApplication(jobId: string, dto: InferDto<typeof AddApplicationDto>) {
      await this.ensureJobExists(jobId);
      const application = await this.prisma.jobApplication.create({
        data: {
          jobId,
          dateSent: new Date(dto.dateSent),
          tailoringScore: dto.tailoringScore,
          cvVersionId: dto.cvVersionId ?? null
        }
      });
  
      await this.touchJob(jobId);
      await t
```

### Related
- [chunk-backend-contacts](./chunk-backend-contacts.md)
- [chunk-backend-followups](./chunk-backend-followups.md)
- [chunk-backend-outreach](./chunk-backend-outreach.md)
