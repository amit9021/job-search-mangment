import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

import { createTaskSchema } from './create-task.dto';

export const bulkCreateTasksSchema = z.object({
  tasks: z.array(createTaskSchema)
});

export class BulkCreateTasksDto extends createZodDto(bulkCreateTasksSchema) {}

export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;
