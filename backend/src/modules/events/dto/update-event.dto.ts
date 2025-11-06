import { EventStatus } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  location: z.string().optional(),
  topic: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  targetsMinConversations: z.number().optional()
});

export class UpdateEventDto extends createZodDto(schema) {}
