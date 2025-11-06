import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z
  .object({
    projectName: z.string().min(1).max(200).optional(),
    platformUrl: z.string().url().optional(),
    spotlight: z.boolean().optional(),
    plannedPost: z.string().max(4000).optional(),
    published: z.boolean().optional(),
    publishedAt: z.coerce.date().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
    path: []
  });

export class UpdateProjectHighlightDto extends createZodDto(schema) {}
