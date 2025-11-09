---
id: chunk-backend-boosts
title: Backend · Boost Tasks
module: backend-boosts
generated_at: 2025-11-09T08:03:21.008Z
tags: ["api","service"]
source_paths: ["backend/src/modules/boosts/boosts.controller.ts","backend/src/modules/boosts/boosts.service.ts"]
exports: ["BoostsController","BoostsService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/dayjs","./boosts.service","./dto/create-boost-task.dto","@nestjs/common"]
tokens_est: 277
---

### Summary
- Manages short, high-impact boost tasks under /boosts list/create/update/delete routes.

### Key API / Logic

### Operational Notes

**Invariants**
- Impact scores are simple integers; keep DTO validation tight to avoid noisy data.
- Completing a boost stamps doneAt via shared dayjs helper.

**Failure modes**
- Completing missing IDs raises NotFoundException.
- Reopen/delete operations rely on optimistic updates; double-submit will error.

**Extension tips**
- Add prioritization fields by extending Prisma + React data grids.
- Batch-complete flows should wrap operations in Prisma transactions.

#### backend/src/modules/boosts/boosts.controller.ts

```ts
export class BoostsController {
  @Get()
    async list() {
      return this.boostsService.list();
    }

  @Post()
    async create(@Body() body: CreateBoostTaskDto) {
      return this.boostsService.create(body);
    }

  @Patch(':id/complete')
    async complete(@Param() params: IdParamDto) {
      return this.boostsService.complete(params.id);
    }

  @Patch(':id/reopen')
    async reopen(@Param() params: IdParamDto) {
      return this.boostsService.reopen(params.id);
    }

  @Delete(':id')
    async delete(@Param() params: IdParamDto) {
      return this.boostsService.delete(params.id);
    }
}
```

#### backend/src/modules/boosts/boosts.service.ts

```ts
export class BoostsService {
  async list() {
      return this.prisma.boostTask.findMany({
        orderBy: [{ doneAt: 'asc' }, { impactScore: 'desc' }]
      });
    }

  async create(data: { title: string; impactScore: number }) {
      return this.prisma.boostTask.create({
        data: {
          title: data.title,
          impactScore: data.impactScore
        }
      });
    }

  async complete(id: string) {
      const task = await this.prisma.boostTask.findUnique({ where: { id } });
      if (!task) {
        throw new NotFoundException('Boost task not found');
      }
      return this.prisma.boostTask.update({
        where: { id },
        data: { doneAt: dayjs().toDate() }
      });
    }

  async reopen(id: string) {
      return this.prisma.boostTask.update({
        where: { id },
        data: { doneAt: null }
      });
    }

  async delete(id: string) {
      return this.prisma.boostTask.delete({ where: { id } });
    }
}
```

### Related
- [chunk-backend-grow](./chunk-backend-grow.md)
