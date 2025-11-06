import { OutreachContext, OutreachOutcome } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z
  .object({
    context: z.nativeEnum(OutreachContext).optional(),
    outcome: z.nativeEnum(OutreachOutcome).optional(),
    content: z.string().optional(),
    messageType: z.string().min(1).optional(),
    personalizationScore: z.number().min(0).max(100).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update'
  });

export class UpdateOutreachDto extends createZodDto(schema) {}

export type UpdateOutreachInput = z.infer<typeof schema>;
