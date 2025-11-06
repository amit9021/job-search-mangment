import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  projectId: z.string().cuid(),
  summary: z.string().optional(),
  qualityScore: z.number().min(0).max(100).optional()
});

export class CreateReviewDto extends createZodDto(schema) {}
