---
id: chunk-backend-projects
title: Backend · Projects & Reviews
module: backend-projects
generated_at: 2025-11-13T11:35:30.183Z
tags: ["api","service"]
source_paths: ["backend/src/modules/projects/projects.controller.ts","backend/src/modules/projects/projects.service.ts","backend/src/modules/reviews/reviews.controller.ts","backend/src/modules/reviews/reviews.service.ts"]
exports: ["ProjectsController","ProjectsService","ReviewsController","ReviewsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","./dto","./dto/create-review.dto","./projects.service","./reviews.service","@nestjs/common"]
tokens_est: 557
---

### Summary
- Projects API tracks repo highlights; Reviews API logs code review interactions.
- Feeds Grow experience and growth metrics.

### Key API / Logic

### Operational Notes

**Invariants**
- Project highlights set spotlight flags that the frontend relies on for layout.
- Review completion toggles reviewedAt and must stay consistent with Growth metrics.

**Failure modes**
- Deleting linked projects without cascading reviews leads to referential integrity errors.
- Missing reviewer/contact relations raise NotFoundException.

**Extension tips**
- Add new project metadata by updating Prisma + DTOs, then regenerate context.
- When integrating third-party repos, sanitize repoUrl before storing.

#### backend/src/modules/projects/projects.controller.ts

```ts
export class ProjectsController {
  @Get()
    async list() {
      return this.projectsService.list();
    }

  @Post()
    async create(@Body() body: CreateProjectDto) {
      return this.projectsService.create(body);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateProjectDto) {
      return this.projectsService.update(params.id, body);
    }

  @Post(':id/spotlight')
    async toggleSpotlight(@Param() params: IdParamDto) {
      return this.projectsService.toggleSpotlight(params.id);
    }

  @Delete(':id')
    async delete(@Param() params: IdParamDto) {
      return this.projectsService.delete(params.id);
    }
}
```

#### backend/src/modules/projects/projects.service.ts

```ts
export class ProjectsService {
  async list() {
      return this.prisma.project.findMany({
        orderBy: [{ spotlight: 'desc' }, { createdAt: 'desc' }]
      });
    }

  async create(params: CreateProjectParams) {
      const project = await this.prisma.project.create({
        data: {
          name: params.name,
          repoUrl: params.repoUrl,
          stack: params.stack ?? null,
          spotlight: params.spotlight ?? false
        }
      });
  
      if (project.spotlight) {
        await this.ensureSingleSpotlight(project.id);
      }
  
      return project;
    }

  async update(id: string, params: UpdateProjectParams) {
      const data: Record<string, unknown> = {};
      if (params.name !== undefined) data.name = params.name;
      if (params.repoUrl !== undefined) data.repoUrl = params.repoUrl;
      if (params.stack !== undefined) data.stack = params.stack;
      if (params.spotlight !== undefined) data.spotlight = params.spotlight;
  
      const project = await this.prisma.project.update({
        where: { id },
        data
      });
  
      if (params.spotlight) {
        await this.ensureSingleSpotlight(project.id);
      }
  
      return project;
    }

  async toggleSpotlight(id: string) {
      const project = await this.prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      const updated = await this.prisma.project.update({
        where: { id },
        data: { spotlight: !project.spotlight }
      });
      if (updated.spotlight) {
        await this.ensureSingleSpotlight(id);
      }
      return updated;
    }

  async delete(id: string) {
      return this.prisma.project.delete({ where: { id } });
    }
}
```

#### backend/src/modules/reviews/reviews.controller.ts

```ts
export class ReviewsController {
  @Get()
    async list() {
      return this.reviewsService.list();
    }

  @Post()
    async create(@Body() body: CreateReviewBodyDto) {
      return this.reviewsService.create(body);
    }
}
```

#### backend/src/modules/reviews/reviews.service.ts

```ts
export class ReviewsService {
  async list() {
      return this.prisma.codeReview.findMany({
        orderBy: { requestedAt: 'desc' },
        include: { contact: true, project: true }
      });
    }

  async createForContact(contactId: string, params: Omit<CreateReviewParams, 'contactId'>) {
      return this.create({ contactId, ...params });
    }

  async create(params: CreateReviewParams) {
      const contact = await this.prisma.contact.findUnique({ where: { id: params.contactId } });
      if (!contact) {
        throw new NotFoundException('Contact not found');
      }
      const project = await this.prisma.project.findUnique({ where: { id: params.projectId } });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
  
      const review = await this.prisma.codeReview.create({
        data: {
          contactId: params.contactId,
          projectId: params.projectId,
          summary: params.summary ?? null,
          qualityScore: params.qualityScore ?? null,
          reviewedAt: params.qualityScore !== undefined ? new Date() : null
        },
        include: { contact: true, project: true }
      });
  
      if (contact.strength === 'WEAK') {
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { strength: 'MEDIUM' }
        });
      }
  
      return review;
    }
}
```

### Related
- [chunk-backend-grow](./chunk-backend-grow.md)
