import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import dayjs from '../../utils/dayjs';

import { CreateTaskInput } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query';
import { OutreachAutomationInput } from './dto/outreach-automation.dto';
import { QuickParseInput } from './dto/quick-parse.dto';
import { UpdateTaskInput } from './dto/update-task.dto';
import { calculateCompletionStreak } from './task-kpis';
import { parseQuickTaskInput } from './task-parser';
import { computeSnoozedDueAt } from './task-snooze';
import {
  ACTIVE_TASK_STATUSES,
  DEFAULT_TASK_TIME,
  SnoozePreset,
  TaskPriority,
  TaskSource,
  TaskStatus
} from './task.constants';

type QuickParseSuggestion = {
  kind: 'job' | 'contact';
  query: string;
  matches: Array<{ id: string; label: string }>;
};

type TaskLinks = {
  jobId?: string;
  contactId?: string;
  growType?: string;
  growId?: string;
  outreachId?: string;
  followUpId?: string;
  [key: string]: unknown;
};

type TaskContext = {
  job?: { id: string; company: string; role: string | null } | null;
  contact?: { id: string; name: string | null } | null;
  grow?: { type: string; id?: string | null } | null;
};

// Unused but kept for future use
// type ActionableTask = {
//   id: string;
//   title: string;
//   dueAt: Date | null;
//   links: TaskLinks;
// };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractLinks = (value: Prisma.JsonValue | null | undefined): TaskLinks => {
  if (!isRecord(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const links: TaskLinks = {};
  if (typeof record.jobId === 'string') {
    links.jobId = record.jobId;
  }
  if (typeof record.contactId === 'string') {
    links.contactId = record.contactId;
  }
  if (typeof record.growType === 'string') {
    links.growType = record.growType;
  }
  if (typeof record.growId === 'string') {
    links.growId = record.growId;
  }
  if (typeof record.outreachId === 'string') {
    links.outreachId = record.outreachId;
  }
  if (typeof record.followUpId === 'string') {
    links.followUpId = record.followUpId;
  }
  return links;
};

@Injectable()
export class TasksService {
  private readonly timezone = process.env.TIMEZONE ?? 'UTC';

  constructor(private readonly prisma: PrismaService) {}

  private now() {
    return dayjs().tz(this.timezone);
  }

  private buildTaskData(payload: CreateTaskInput) {
    const now = this.now();
    const status: TaskStatus = (payload.status as TaskStatus) ?? 'Todo';
    const priority: TaskPriority = (payload.priority as TaskPriority) ?? 'Med';
    const source: TaskSource = (payload.source as TaskSource) ?? 'Manual';
    const completedAt =
      payload.completedAt ??
      (status === 'Done' ? now.clone().second(0).millisecond(0).toDate() : undefined);

    return {
      title: payload.title,
      description: payload.description ?? null,
      status,
      priority,
      tags: payload.tags ?? [],
      dueAt: payload.dueAt ?? null,
      startAt: payload.startAt ?? null,
      recurrence: payload.recurrence ?? null,
      source,
      links: payload.links ? (payload.links as Prisma.JsonObject) : undefined,
      checklist: (payload.checklist ?? []).map((item) => ({
        text: item.text,
        done: item.done ?? false
      })),
      completedAt: completedAt ?? null
    };
  }

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
      where.tags = { hasSome: query.tags };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [];
    if (view === 'completed') {
      orderBy.push({ completedAt: 'desc' });
    } else if (view === 'backlog') {
      orderBy.push({ createdAt: 'asc' });
    } else {
      orderBy.push({ dueAt: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' });
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy
    });

    const parsedLinks = tasks.map((task) => extractLinks(task.links));
    const jobIds = Array.from(
      new Set(parsedLinks.map((link) => link.jobId).filter((id): id is string => Boolean(id)))
    );
    const contactIds = Array.from(
      new Set(parsedLinks.map((link) => link.contactId).filter((id): id is string => Boolean(id)))
    );

    const [jobs, contacts] = await Promise.all([
      jobIds.length
        ? this.prisma.job.findMany({
            where: { id: { in: jobIds } },
            select: { id: true, company: true, role: true }
          })
        : Promise.resolve([]),
      contactIds.length
        ? this.prisma.contact.findMany({
            where: { id: { in: contactIds } },
            select: { id: true, name: true }
          })
        : Promise.resolve([])
    ]);

    const jobMap = new Map(jobs.map((job) => [job.id, job]));
    const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));

    return tasks.map((task, index) => {
      const links = parsedLinks[index];
      const context: TaskContext = {};
      if (links.jobId) {
        context.job = jobMap.get(links.jobId) ?? null;
      }
      if (links.contactId) {
        context.contact = contactMap.get(links.contactId) ?? null;
      }
      if (links.growType) {
        context.grow = { type: links.growType, id: links.growId ?? null };
      }

      return {
        ...task,
        links,
        context
      };
    });
  }

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
    if (payload.startAt !== undefined) {
      data.startAt = payload.startAt ?? null;
    }
    if (payload.recurrence !== undefined) {
      data.recurrence = payload.recurrence ?? null;
    }
    if (payload.source !== undefined) {
      data.source = payload.source;
    }
    if (payload.links !== undefined) {
      data.links = payload.links ? (payload.links as Prisma.JsonObject) : Prisma.JsonNull;
    }
    if (payload.checklist !== undefined) {
      data.checklist = payload.checklist.map((item) => ({
        text: item.text,
        done: item.done ?? false
      })) as Prisma.InputJsonValue;
    }
    if (payload.completedAt !== undefined) {
      data.completedAt = payload.completedAt ?? null;
      if (payload.completedAt && payload.status === undefined) {
        data.status = 'Done';
      }
    }

    return this.prisma.task.update({
      where: { id },
      data
    });
  }

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
          matches: matches.map((match) => ({
            id: match.id,
            label: `${match.company} — ${match.role}`
          }))
        });
      }
    }

    if (intermediate.contexts.contactQuery) {
      const matches = await this.prisma.contact.findMany({
        where: {
          name: { contains: intermediate.contexts.contactQuery, mode: 'insensitive' }
        },
        select: { id: true, name: true, company: { select: { name: true } } },
        take: 5
      });
      if (matches.length === 1) {
        links.contactId = matches[0].id;
      } else if (matches.length > 1) {
        suggestions.push({
          kind: 'contact',
          query: intermediate.contexts.contactQuery,
          matches: matches.map((match) => ({
            id: match.id,
            label: match.company?.name ? `${match.name} @ ${match.company.name}` : match.name
          }))
        });
      }
    }

    if (intermediate.contexts.growType) {
      links.growType = intermediate.contexts.growType;
      if (intermediate.contexts.growRef) {
        links.growId = intermediate.contexts.growRef;
      }
    }

    const resolvedLinks = Object.fromEntries(
      Object.entries(links).filter(([, value]) => value !== undefined && value !== '')
    );

    return {
      title: intermediate.title,
      tags: intermediate.tags,
      priority: intermediate.priority,
      dueAt: intermediate.dueAt ?? null,
      recurrence: intermediate.recurrence ?? null,
      links: resolvedLinks,
      contexts: intermediate.contexts,
      suggestions
    };
  }

  async snooze(id: string, preset: SnoozePreset) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { status: true } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.status === 'Done') {
      throw new BadRequestException('Completed tasks cannot be snoozed');
    }
    const dueAt = computeSnoozedDueAt(preset, { timezone: this.timezone });
    return this.prisma.task.update({
      where: { id },
      data: { dueAt }
    });
  }

  async getActionableTasks(limitPerBucket = 25) {
    const now = this.now();
    const startOfDay = now.clone().startOf('day').toDate();
    const endOfDay = now.clone().endOf('day').toDate();

    const select = {
      id: true,
      title: true,
      dueAt: true,
      links: true
    } satisfies Prisma.TaskSelect;

    const [dueTodayRaw, overdueRaw] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          status: { not: 'Done' },
          dueAt: { gte: startOfDay, lte: endOfDay }
        },
        orderBy: { dueAt: 'asc' },
        take: limitPerBucket,
        select
      }),
      this.prisma.task.findMany({
        where: {
          status: { not: 'Done' },
          dueAt: { lt: startOfDay }
        },
        orderBy: { dueAt: 'asc' },
        take: limitPerBucket,
        select
      })
    ]);

    const jobIds = new Set<string>();
    const contactIds = new Set<string>();

    const normalize = (task: {
      id: string;
      title: string;
      dueAt: Date | null;
      links: Prisma.JsonValue;
    }) => {
      const links = extractLinks(task.links);
      if (links.jobId) {
        jobIds.add(links.jobId);
      }
      if (links.contactId) {
        contactIds.add(links.contactId);
      }
      return {
        id: task.id,
        title: task.title,
        dueAt: task.dueAt,
        links
      };
    };

    const dueTodayMapped = dueTodayRaw.map((task) => normalize(task));
    const overdueMapped = overdueRaw.map((task) => normalize(task));

    const jobs = jobIds.size
      ? await this.prisma.job.findMany({
          where: { id: { in: Array.from(jobIds) } },
          select: { id: true, archived: true, stage: true }
        })
      : [];

    const contacts = contactIds.size
      ? await this.prisma.contact.findMany({
          where: { id: { in: Array.from(contactIds) } },
          select: { id: true, archived: true }
        })
      : [];

    const archivedJobStages = new Set(['REJECTED', 'DORMANT']);
    const jobState = new Map(jobs.map((job) => [job.id, job]));
    const contactState = new Map(contacts.map((contact) => [contact.id, contact]));

    const filterTask = (task: ReturnType<typeof normalize>) => {
      if (task.links.jobId) {
        const job = jobState.get(task.links.jobId);
        if (!job || job.archived || (job.stage && archivedJobStages.has(job.stage))) {
          return false;
        }
      }
      if (task.links.contactId) {
        const contact = contactState.get(task.links.contactId);
        if (!contact || contact.archived) {
          return false;
        }
      }
      return true;
    };

    return {
      dueToday: dueTodayMapped.filter(filterTask),
      overdue: overdueMapped.filter(filterTask)
    };
  }

  async getKpis() {
    const now = this.now();
    const startOfDay = now.clone().startOf('day').toDate();
    const endOfDay = now.clone().endOf('day').toDate();
    const weekAgo = now.clone().subtract(7, 'day').startOf('day').toDate();

    const [dueToday, overdue, velocity7d, completed] = await Promise.all([
      this.prisma.task.count({
        where: {
          status: { not: 'Done' },
          dueAt: { gte: startOfDay, lte: endOfDay }
        }
      }),
      this.prisma.task.count({
        where: {
          status: { not: 'Done' },
          dueAt: { lt: now.toDate() }
        }
      }),
      this.prisma.task.count({
        where: {
          status: 'Done',
          completedAt: { gte: weekAgo }
        }
      }),
      this.prisma.task.findMany({
        where: {
          status: 'Done',
          completedAt: { not: null, lte: now.toDate() }
        },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
        take: 45
      })
    ]);

    const streak = calculateCompletionStreak(
      completed.map((item) => item.completedAt as Date),
      { now, timezone: this.timezone }
    );

    return { dueToday, overdue, velocity7d, streak };
  }

  async handleOutreachAutomation(payload: OutreachAutomationInput) {
    const normalized = (payload.outcome ?? '').toUpperCase();
    if (normalized && normalized !== 'NONE' && normalized !== 'NO_RESPONSE') {
      return { created: false, reason: 'outcome_resolved' };
    }

    const [contact, job] = await Promise.all([
      payload.contactId
        ? this.prisma.contact.findUnique({
            where: { id: payload.contactId },
            select: { id: true, name: true }
          })
        : null,
      payload.jobId
        ? this.prisma.job.findUnique({
            where: { id: payload.jobId },
            select: { id: true, company: true, role: true }
          })
        : null
    ]);

    let title = 'Follow up outreach';
    if (contact && job) {
      title = `Follow up with ${contact.name} @ ${job.company}`;
    } else if (contact) {
      title = `Follow up with ${contact.name}`;
    } else if (job) {
      title = `Follow up with ${job.company}`;
    }

    const dueAt = this.now()
      .add(3, 'day')
      .hour(DEFAULT_TASK_TIME.hour)
      .minute(DEFAULT_TASK_TIME.minute)
      .second(0)
      .millisecond(0)
      .toDate();

    const created = await this.prisma.task.create({
      data: {
        title,
        status: 'Todo',
        priority: 'Med',
        dueAt,
        tags: ['followup'],
        source: 'Rule',
        links: {
          outreachId: payload.outreachId ?? null,
          contactId: payload.contactId ?? null,
          jobId: payload.jobId ?? null
        } as Prisma.JsonObject,
        checklist: []
      }
    });

    return { created: true, taskId: created.id };
  }
}
