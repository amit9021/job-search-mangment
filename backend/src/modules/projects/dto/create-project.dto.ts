import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1),
  repoUrl: z.string().url(),
  stack: z.string().optional(),
  spotlight: z.boolean().optional()
});

export class CreateProjectDto extends createZodDto(schema) {}
