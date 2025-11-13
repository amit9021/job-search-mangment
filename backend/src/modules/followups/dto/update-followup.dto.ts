import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const appointmentModes = ['MEETING', 'ZOOM', 'PHONE', 'ON_SITE', 'OTHER'] as const;

const schema = z.object({
  dueAt: z
    .string()
    .datetime({ message: 'dueAt must be an ISO timestamp' })
    .optional(),
  note: z
    .string()
    .trim()
    .max(500, 'Note must be 500 characters or fewer')
    .optional(),
  contactId: z.string().cuid().optional(),
  appointmentMode: z.enum(appointmentModes).optional()
});

export class UpdateFollowupDto extends createZodDto(schema) {}
