import { ReferralKind } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  jobId: z.string().cuid().optional(),
  kind: z.nativeEnum(ReferralKind),
  note: z.string().optional()
});

export class CreateReferralDto extends createZodDto(schema) {}
