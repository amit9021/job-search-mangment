import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const sourceUrlSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return null;
  }
  return value;
}, z.string().url().max(500).nullable().optional());

const schema = z
  .object({
    company: z.string().min(1).max(200).optional(),
    role: z.string().min(1).max(200).optional(),
    sourceUrl: sourceUrlSchema,
    companyId: z.string().optional().nullable()
  })
  .strict();

export class UpdateJobDto extends createZodDto(schema) {}
