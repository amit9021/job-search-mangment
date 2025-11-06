import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';
import { TASK_PRIORITIES, TASK_SOURCES, TASK_STATUSES } from '../task.constants';

const dateOptional = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return value;
}, z.date().optional());

const tagsSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string()).default([]));

const checklistItemSchema = z.object({
  text: z.string().min(1),
  done: z.boolean().optional()
});

const checklistSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return [];
  }
  return value;
}, z.array(checklistItemSchema).default([]));

const linksSchema = z
  .object({
    jobId: z.string().cuid().optional(),
    contactId: z.string().cuid().optional(),
    growType: z.enum(['boost', 'event', 'review', 'project']).optional(),
    growId: z.string().optional()
  })
  .partial()
  .optional();

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  tags: tagsSchema,
  dueAt: dateOptional,
  startAt: dateOptional,
  recurrence: z.string().optional(),
  source: z.enum(TASK_SOURCES).optional(),
  links: linksSchema,
  checklist: checklistSchema,
  completedAt: dateOptional
});

export class CreateTaskDto extends createZodDto(createTaskSchema) {}

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
