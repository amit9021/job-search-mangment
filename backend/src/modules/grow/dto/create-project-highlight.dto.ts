import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  projectName: z.string().min(1).max(200),
  platformUrl: z
    .string()
    .url()
    .optional(),
  spotlight: z.boolean().optional(),
  plannedPost: z.string().max(4000).optional(),
  published: z.boolean().optional(),
  publishedAt: z.coerce.date().optional()
});

export class CreateProjectHighlightDto extends createZodDto(schema) {}
