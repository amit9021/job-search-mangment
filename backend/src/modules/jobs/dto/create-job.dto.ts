import { JobStage, OutreachChannel, OutreachOutcome } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const initialOutreachSchema = z
  .object({
    contactId: z.string().cuid().optional(),
    channel: z.nativeEnum(OutreachChannel),
    messageType: z.string().min(1),
    personalizationScore: z.number().min(0).max(100),
    outcome: z.nativeEnum(OutreachOutcome).optional(),
    content: z.string().optional(),
    followUpNote: z.string().optional()
  })
  .optional();

const initialApplicationSchema = z
  .object({
    tailoringScore: z.number().min(0).max(100),
    cvVersionId: z.string().optional(),
    dateSent: z.string().datetime().optional()
  })
  .optional();

const schema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  deadline: z.string().datetime().optional(),
  heat: z.number().min(0).max(3).optional(),
  stage: z.nativeEnum(JobStage).optional(),
  initialOutreach: initialOutreachSchema,
  initialApplication: initialApplicationSchema
});

export class CreateJobDto extends createZodDto(schema) {}
