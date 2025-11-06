import { EventStatus } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1),
  date: z.string().datetime(),
  location: z.string().optional(),
  topic: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  targetsMinConversations: z.number().optional()
});

export class CreateEventDto extends createZodDto(schema) {}
