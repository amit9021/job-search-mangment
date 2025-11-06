import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';
import { TASK_PRIORITIES, TASK_SOURCES, TASK_STATUSES } from '../task.constants';

const optionalDate = z.preprocess((value) => {
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

const optionalTags = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
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
}, z.array(z.string()).optional());

const optionalChecklistItem = z.object({
  text: z.string().min(1),
  done: z.boolean().optional()
});

const optionalChecklist = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return value;
}, z.array(optionalChecklistItem).optional());

const optionalLinks = z
  .object({
    jobId: z.string().cuid().optional(),
    contactId: z.string().cuid().optional(),
    growType: z.enum(['boost', 'event', 'review', 'project']).optional(),
    growId: z.string().optional()
  })
  .partial()
  .optional();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    tags: optionalTags,
    dueAt: optionalDate,
    startAt: optionalDate,
    recurrence: z.string().nullable().optional(),
    source: z.enum(TASK_SOURCES).optional(),
    links: optionalLinks,
    checklist: optionalChecklist,
    completedAt: optionalDate
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  });

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
