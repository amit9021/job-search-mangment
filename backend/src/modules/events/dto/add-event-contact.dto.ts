import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  contactId: z.string().cuid(),
  followupDueAt: z.string().datetime().optional(),
  note: z.string().optional()
});

export class AddEventContactDto extends createZodDto(schema) {}
