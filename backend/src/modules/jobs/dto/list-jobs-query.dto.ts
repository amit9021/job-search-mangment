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

const querySchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return value;
  },
  z.string().min(1).max(200).optional()
);

const schema = z.object({
  stage: z.nativeEnum(JobStage).optional(),
  heat: heatSchema,
  includeArchived: includeArchivedSchema,
  query: querySchema,
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional()
});

export class ListJobsQueryDto extends createZodDto(schema) {}
