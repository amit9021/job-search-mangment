import { ReferralKind } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  contactId: z.string().cuid(),
  jobId: z.string().cuid().optional(),
  kind: z.nativeEnum(ReferralKind),
  note: z.string().optional()
});

export class CreateReferralBodyDto extends createZodDto(schema) {}
