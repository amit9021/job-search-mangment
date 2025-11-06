import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const category = z.enum(['skills-gap', 'visibility-gap', 'network-gap']);
const status = z.enum(['pending', 'in-progress', 'completed']);

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  category,
  impactLevel: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  status: status.optional()
});

export class CreateGrowthBoostTaskDto extends createZodDto(schema) {}
export const boostTaskCategorySchema = category;
export const boostTaskStatusSchema = status;
