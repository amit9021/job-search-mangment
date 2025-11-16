import { FollowUpType, FollowUpAppointmentMode } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const appointmentModes = Object.values(FollowUpAppointmentMode) as [FollowUpAppointmentMode, ...FollowUpAppointmentMode[]];

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
  type: z.nativeEnum(FollowUpType).optional().default(FollowUpType.APPOINTMENT),
  appointmentMode: z.enum(appointmentModes).optional()
});

export class CreateFollowupDto extends createZodDto(schema) {}
