import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';
import { TASK_PRIORITIES, TASK_STATUSES } from '../task.constants';

const viewValues = ['today', 'upcoming', 'backlog', 'completed'] as const;

const tagsFilter = z.preprocess(
  (value) => {
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
  },
  z.array(z.string()).optional()
);

export const listTasksSchema = z.object({
  view: z.enum(viewValues).optional(),
  tags: tagsFilter,
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  search: z.string().optional()
});

export class ListTasksQueryDto extends createZodDto(listTasksSchema) {}

export type ListTasksQuery = z.infer<typeof listTasksSchema>;
