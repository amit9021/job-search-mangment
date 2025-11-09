---
id: chunk-backend-grow
title: Backend · Grow API
module: backend-grow
generated_at: 2025-11-09T08:03:21.008Z
tags: ["api","service"]
source_paths: ["backend/src/modules/grow/grow.controller.ts","backend/src/modules/grow/grow.service.ts"]
exports: ["GrowController","GrowService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/create-zod-dto","../../utils/dayjs","./boost-recommender","./dto","./grow.service","@nestjs/common"]
tokens_est: 646
---

### Summary
- Aggregates growth reviews, boost tasks, and events for /grow endpoints.
- Provides mutation endpoints for GrowthBoostTask lifecycle.

### Key API / Logic

### Operational Notes

**Invariants**
- Growth boost tasks categorized by impactLevel; keep values within 1-5 scale.
- Reviews must link to contacts for contextual follow-ups.

**Failure modes**
- Attempting to complete nonexistent growth tasks raises NotFoundException.
- Leaving reviewer/contact IDs blank violates Prisma schema.

**Extension tips**
- Consider using transactions when updating review plus growth stats simultaneously.
- Add new categories/tags via Prisma enums + React filters.

#### backend/src/modules/grow/grow.controller.ts

```ts
export class GrowController {
  @Get('reviews')
    async listReviews() {
      return this.growService.listReviews();
    }

  @Post('reviews')
    async createReview(@Body() body: CreateGrowthReviewDto) {
      return this.growService.createReview(body);
    }

  @Get('events')
    async listEvents() {
      return this.growService.listEvents();
    }

  @Post('events')
    async createEvent(@Body() body: CreateGrowthEventDto) {
      return this.growService.createEvent(body);
    }

  @Get('boost')
    async listBoostTasks() {
      return this.growService.listBoostTasks();
    }

  @Post('boost')
    async createBoostTask(@Body() body: CreateGrowthBoostTaskDto) {
      return this.growService.createBoostTask(body);
    }

  @Get('boost/suggest')
    async suggestBoostTasks() {
      return this.growService.suggestBoostTasks();
    }

  @Patch('boost/:id')
    async updateBoostTask(@Param() params: IdParamDto, @Body() body: UpdateGrowthBoostTaskDto) {
      return this.growService.updateBoostTask(params.id, body);
    }

  @Get('projects')
    async listProjectHighlights() {
      return this.growService.listProjectHighlights();
    }

  @Post('projects')
    async createProjectHighlight(@Body() body: CreateProjectHighlightDto) {
      return this.growService.createProjectHighlight(body);
    }

  @Patch('projects/:id')
    async updateProjectHighlight(
      @Param() params: IdParamDto,
      @Body() body: UpdateProjectHighlightDto
    ) {
      return this.growService.updateProjectHighlight(params.id, body);
    }
}
```

#### backend/src/modules/grow/grow.service.ts

```ts
export class GrowService {
  async listReviews() {
      return this.prisma.growthReview.findMany({
        orderBy: { reviewedAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              role: true,
              company: { select: { id: true, name: true } }
            }
          }
        }
      });
    }

  async createReview(dto: CreateReviewInput) {
      const contact = await this.prisma.contact.findUnique({ where: { id: dto.reviewerId } });
      if (!contact) {
        throw new NotFoundException('Reviewer contact not found');
      }
  
      return this.prisma.growthReview.create({
        data: {
          reviewerId: dto.reviewerId,
          projectName: dto.projectName,
          summary: dto.summary,
          score: dto.score,
          takeaways: dto.takeaways?.trim()?.length ? dto.takeaways.trim() : null
        },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              role: true,
              company: { select: { id: true, name: true } }
            }
          }
        }
      });
    }

  async listEvents() {
      return this.prisma.growthEvent.findMany({
        orderBy: { date: 'desc' }
      });
    }

  async createEvent(dto: CreateEventInput) {
      return this.prisma.growthEvent.create({
        data: {
          name: dto.name,
          date: dto.date,
          location: dto.location ?? null,
          attended: dto.attended ?? false,
          notes: dto.notes ?? null,
          followUps: dto.followUps ?? []
        }
      });
    }

  async listBoostTasks() {
      return this.prisma.growthBoostTask.findMany({
        orderBy: [{ status: 'asc' }, { impactLevel: 'desc' }, { createdAt: 'asc' }]
      });
    }

  async createBoostTask(dto: CreateBoostTaskInput) {
      return this.prisma.growthBoostTask.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          category: dto.category,
          impactLevel: dto.impactLevel,
          tags: dto.tags ?? [],
          status: dto.status ?? 'pending',
          completedAt: dto.status === 'completed' ? new Date() : null
        }
      });
    }

  async updateBoostTask(id: string, dto: UpdateBoostTaskInput) {
      const boostTask = await this.ensureBoostTask(id);
  
      const status = dto.status ?? boostTask.status;
      return this.prisma.growthBoostTask.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description ?? null }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.impactLevel !== undefined && { impactLevel: dto.impactLevel }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          status,
          completedAt: status === 'completed' ? (boostTask.completedAt ?? new Date()) : null
        }
      });
    }

  async listProjectHighlights() {
      return this.prisma.projectHighlight.findMany({
        orderBy: [{ spotlight: 'desc' }, { published: 'desc' }, { createdAt: 'desc' }]
      });
    }

  async createProjectHighlight(dto: CreateProjectHighlightInput) {
      return this.prisma.projectHighlight.create({
        data: {
          projectName: dto.projectName,
          platformUrl: dto.platformUrl ?? null,
          spotlight: dto.spotlight ?? false,
          plannedPost: dto.plannedPost ?? null,
          published: dto.published ?? false,
          publishedAt: dto.published ? (dto.publishedAt ?? new Date()) : null
        }
      });
    }

  async updateProjectHighlight(id: string, dto: UpdateProjectHighlightInput) {
      await this.ensureProjectHighlight(id);
      const published = dto.published;
  
      return this.prisma.projectHighlight.update({
        where: { id },
        data: {
          ...(dto.projectName !== undefined &
```

### Related
- [chunk-backend-projects](./chunk-backend-projects.md)
- [chunk-backend-boosts](./chunk-backend-boosts.md)
