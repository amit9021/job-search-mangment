import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  title: z.string().min(1),
  impactScore: z.number().min(1).max(10)
});

export class CreateBoostTaskDto extends createZodDto(schema) {}
