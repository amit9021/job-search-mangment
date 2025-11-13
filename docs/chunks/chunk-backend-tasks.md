---
id: chunk-backend-tasks
title: Backend · Tasks & Automation
module: backend-tasks
generated_at: 2025-11-09T09:43:23.366Z
tags: ["api","service"]
source_paths: ["backend/src/modules/tasks/tasks.controller.ts","backend/src/modules/tasks/automation.controller.ts","backend/src/modules/tasks/tasks.service.ts"]
exports: ["AutomationController","TasksController","TasksService"]
imports: ["../../common/dto/id-param.dto","../../prisma/prisma.service","../../utils/dayjs","./dto/bulk-create-tasks.dto","./dto/create-task.dto","./dto/list-tasks.query","./dto/outreach-automation.dto","./dto/quick-parse.dto","./dto/snooze-task.dto","./dto/update-task.dto","./task-kpis","./task-parser","./task-snooze","./task.constants","./tasks.service","@nestjs/common","@prisma/client"]
tokens_est: 694
---

### Summary
- CRUD endpoints for tasks plus automation controls at /tasks and /automation.
- Service exposes getActionableTasks powering dashboard queue.

### Key API / Logic

### Operational Notes

**Invariants**
- Automation endpoints require idempotent task IDs so scheduler retries stay safe.
- Actionable-task queries always normalize timezone from TIMEZONE env.

**Failure modes**
- Missing tasks raise NotFoundException in service methods.
- Parsing cron-like recurrence strings without validation can break scheduling.

**Extension tips**
- Add new automation flows under tasks/automation.controller + service pair.
- Reuse task-parser utilities when introducing new recurrence types.

#### backend/src/modules/tasks/tasks.controller.ts

```ts
export class TasksController {
  @Get('kpis')
    async getKpis() {
      return this.tasksService.getKpis();
    }

  @Get()
    async list(@Query() query: ListTasksQueryDto) {
      return this.tasksService.list(query);
    }

  @Post()
    async create(@Body() body: CreateTaskDto) {
      return this.tasksService.create(body);
    }

  @Patch(':id')
    async update(@Param() params: IdParamDto, @Body() body: UpdateTaskDto) {
      return this.tasksService.update(params.id, body);
    }

  @Delete(':id')
    async delete(@Param() params: IdParamDto) {
      return this.tasksService.delete(params.id);
    }

  @Post('bulk')
    async bulk(@Body() body: BulkCreateTasksDto) {
      return this.tasksService.bulkCreate(body);
    }

  @Post('quick-parse')
    async quickParse(@Body() body: QuickParseDto) {
      return this.tasksService.quickParse(body);
    }

  @Post('snooze/:id')
    async snooze(@Param() params: IdParamDto, @Body() body: SnoozeTaskDto) {
      return this.tasksService.snooze(params.id, body.preset);
    }
}
```

#### backend/src/modules/tasks/automation.controller.ts

```ts
export class AutomationController {
  @Post('outreach-created')
    async outreachCreated(@Body() body: OutreachAutomationDto) {
      return this.tasksService.handleOutreachAutomation(body);
    }
}
```

#### backend/src/modules/tasks/tasks.service.ts

```ts
export class TasksService {
  async list(query: ListTasksQuery) {
      const view = query.view ?? 'today';
      const now = this.now();
      const startOfDay = now.clone().startOf('day').toDate();
      const endOfDay = now.clone().endOf('day').toDate();
  
      const where: Prisma.TaskWhereInput = {};
  
      // Status handling
      if (query.status) {
        where.status = query.status;
      } else if (view === 'completed') {
        where.status = 'Done';
      } else {
        where.status = { in: ACTIVE_TASK_STATUSES };
      }
  
      switch (view) {
        case 'today':
          where.dueAt = { gte: startOfDay, lte: endOfDay };
          break;
        case 'upcoming':
          where.dueAt = { gt: endOfDay };
          break;
        case 'backlog':
          where.dueAt = null;
          break;
        case 'completed':
          // include all done tasks, rely on status filter
          break;
        default:
          break;
      }
  
      if (query.priority) {
        where.priority = query.priority;
      }
  
      if (query.tags && query.tags.length > 0) {
      
    /* ... truncated ... */

  async create(payload: CreateTaskInput) {
      const data = this.buildTaskData(payload);
      return this.prisma.task.create({ data });
    }

  async update(id: string, payload: UpdateTaskInput) {
      const existing = await this.prisma.task.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Task not found');
      }
  
      const data: Prisma.TaskUpdateInput = {};
  
      if (payload.title !== undefined) {
        data.title = payload.title;
      }
      if (payload.description !== undefined) {
        data.description = payload.description ?? null;
      }
      if (payload.status !== undefined) {
        data.status = payload.status;
        if (payload.status === 'Done') {
          data.completedAt = payload.completedAt ?? existing.completedAt ?? this.now().toDate();
        } else if (payload.completedAt === undefined) {
          data.completedAt = null;
        }
      }
      if (payload.priority !== undefined) {
        data.priority = payload.priority;
      }
      if (payload.tags !== undefined) {
        data.tags = payload.tags;
      }
      if (payload.dueAt !== undefined) {
        data.dueAt = payload.dueAt ?? null;
      }
    /* ... truncated ... */

  async delete(id: string) {
      const existing = await this.prisma.task.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        throw new NotFoundException('Task not found');
      }
  
      await this.prisma.task.delete({ where: { id } });
      return { deletedId: id };
    }

  async bulkCreate(payload: { tasks: CreateTaskInput[] }) {
      if (!payload.tasks || payload.tasks.length === 0) {
        return { createdCount: 0, tasks: [] };
      }
      const created = await Promise.all(
        payload.tasks.map((task) => this.prisma.task.create({ data: this.buildTaskData(task) }))
      );
      return { createdCount: created.length, tasks: created };
    }

  async quickParse(payload: QuickParseInput) {
      const intermediate = parseQuickTaskInput(payload.text, { timezone: this.timezone });
  
      const links: Record<string, string | undefined> = {};
      const suggestions: QuickParseSuggestion[] = [];
  
      if (intermediate.contexts.jobQuery) {
        const matches = await this.prisma.job.findMany({
          where: {
            OR: [
              { company: { contains: intermediate.contexts.jobQuery, mode: 'insensitive' } },
              { role: { contains: intermediate.contexts.jobQuery, mode: 'insensitive' } }
            ]
          },
          select: { id: true, company: true, role: true },
          take: 5
        });
        if (matches.length === 1) {
          links.jobId = matches[0].id;
        } else if (matches.length > 1) {
          suggestions.push({
            kind: 'job',
            query: intermediate.contexts.jobQuery,
     
```

### Related
- [chunk-backend-dashboard](./chunk-backend-dashboard.md)
- [chunk-backend-followups](./chunk-backend-followups.md)
