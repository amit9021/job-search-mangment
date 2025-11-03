import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';
import { boostTaskCategorySchema, boostTaskStatusSchema } from './create-growth-boost-task.dto';

const schema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).optional(),
    category: boostTaskCategorySchema.optional(),
    impactLevel: z.number().int().min(1).max(5).optional(),
    tags: z.array(z.string().min(1).max(50)).max(10).optional(),
    status: boostTaskStatusSchema.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
    path: []
  });

export class UpdateGrowthBoostTaskDto extends createZodDto(schema) {}
