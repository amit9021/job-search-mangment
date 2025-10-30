import { JobStage } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const heatSchema = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : Number(value)),
  z.number().min(0).max(3).optional()
);

const includeArchivedSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return value;
  },
  z.boolean().optional()
);

const schema = z.object({
  stage: z.nativeEnum(JobStage).optional(),
  heat: heatSchema,
  includeArchived: includeArchivedSchema
});

export class ListJobsQueryDto extends createZodDto(schema) {}
