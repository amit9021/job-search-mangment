import { OutreachChannel, OutreachOutcome } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  jobId: z.string().cuid().optional(),
  channel: z.nativeEnum(OutreachChannel),
  messageType: z.string().min(1),
  personalizationScore: z.number().min(0).max(100),
  outcome: z.nativeEnum(OutreachOutcome).optional(),
  content: z.string().optional(),
  createFollowUp: z.boolean().default(true),
  followUpNote: z.string().optional()
});

export class CreateContactOutreachDto extends createZodDto(schema) {}
