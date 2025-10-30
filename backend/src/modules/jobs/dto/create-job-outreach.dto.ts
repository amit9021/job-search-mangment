import { OutreachChannel, OutreachOutcome } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const scoreSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      return Number(value);
    }
    return value;
  },
  z.number().min(0).max(100)
);

export const createJobOutreachSchema = z.object({
  contactId: z.string().cuid().optional(),
  channel: z.nativeEnum(OutreachChannel),
  messageType: z.string().min(1),
  personalizationScore: scoreSchema,
  outcome: z.nativeEnum(OutreachOutcome).optional(),
  content: z.string().optional(),
  createFollowUp: z.boolean().optional().default(true),
  followUpNote: z.string().optional()
});

export class CreateJobOutreachDto extends createZodDto(createJobOutreachSchema) {}

export type CreateJobOutreachInput = z.infer<typeof createJobOutreachSchema>;
