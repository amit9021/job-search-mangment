import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1).max(200),
  date: z.coerce.date(),
  location: z.string().max(200).optional(),
  attended: z.boolean().optional(),
  notes: z.string().max(4000).optional(),
  followUps: z.array(z.string().max(200)).max(10).optional()
});

export class CreateGrowthEventDto extends createZodDto(schema) {}
