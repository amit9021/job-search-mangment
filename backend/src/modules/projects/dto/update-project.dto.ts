import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z
  .object({
    name: z.string().min(1).optional(),
    repoUrl: z.string().url().optional(),
    stack: z.string().optional(),
    spotlight: z.boolean().optional()
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'At least one field must be provided'
  });

export class UpdateProjectDto extends createZodDto(schema) {}
