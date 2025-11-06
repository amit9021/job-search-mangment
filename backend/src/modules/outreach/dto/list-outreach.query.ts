import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  jobId: z.string().cuid().optional(),
  contactId: z.string().cuid().optional()
});

export class ListOutreachQueryDto extends createZodDto(schema) {}
