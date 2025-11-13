import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Note cannot be empty')
    .max(2000, 'Note must be 2000 characters or fewer')
});

export class UpdateJobNoteDto extends createZodDto(schema) {}
