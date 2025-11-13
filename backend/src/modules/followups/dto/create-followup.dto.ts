import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const appointmentModes = ['MEETING', 'ZOOM', 'PHONE', 'ON_SITE', 'OTHER'] as const;

const schema = z.object({
  jobId: z.string().cuid(),
  contactId: z.string().cuid().optional(),
  dueAt: z
    .string()
    .datetime({ message: 'dueAt must be an ISO timestamp' }),
  note: z
    .string()
    .trim()
    .max(500, 'Note must be 500 characters or fewer')
    .optional(),
  appointmentMode: z.enum(appointmentModes).optional()
});

export class CreateFollowupDto extends createZodDto(schema) {}
