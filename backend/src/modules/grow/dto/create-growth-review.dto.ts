import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  reviewerId: z.string().cuid(),
  projectName: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  score: z.number().int().min(1).max(5),
  takeaways: z.string().max(4000).optional()
});

export class CreateGrowthReviewDto extends createZodDto(schema) {}
