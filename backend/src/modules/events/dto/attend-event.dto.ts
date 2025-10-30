import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  contacts: z
    .array(
      z.object({
        contactId: z.string().cuid(),
        followupDueAt: z.string().datetime().optional(),
        note: z.string().optional()
      })
    )
    .default([])
});

export class AttendEventDto extends createZodDto(schema) {}
