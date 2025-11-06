import { OutreachChannel, OutreachContext, OutreachOutcome } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const scoreSchema = z
  .preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    return value;
  }, z.number().min(0).max(100).optional())
  .transform((val) => (val === undefined ? undefined : Number(val)));

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .preprocess((value) => {
      if (value === '') {
        return undefined;
      }
      return value;
    }, schema)
    .optional();

const contactCreateSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  role: emptyToUndefined(z.string()),
  email: emptyToUndefined(z.string().email('Invalid email address')),
  linkedinUrl: emptyToUndefined(z.string().url('Invalid LinkedIn URL')),
  companyName: emptyToUndefined(z.string())
});

export const createJobOutreachSchema = z
  .object({
    contactId: z.string().cuid().optional(),
    contactCreate: contactCreateSchema.optional(),
    channel: z.nativeEnum(OutreachChannel),
    messageType: z.string().min(1),
    personalizationScore: scoreSchema,
    outcome: z.nativeEnum(OutreachOutcome).optional(),
    content: z.string().optional(),
    context: z.nativeEnum(OutreachContext).optional(),
    createFollowUp: z.boolean().optional().default(true),
    followUpNote: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.contactId && !value.contactCreate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either contactId or contactCreate',
        path: ['contactId']
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either contactId or contactCreate',
        path: ['contactCreate']
      });
    }
  });

export class CreateJobOutreachDto extends createZodDto(createJobOutreachSchema) {}

export type CreateJobOutreachInput = z.infer<typeof createJobOutreachSchema>;
