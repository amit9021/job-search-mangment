import { JobStage } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';
import { createJobOutreachSchema } from './create-job-outreach.dto';

const isoDateOptional = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return value;
  },
  z.string().datetime().optional()
);

const scoreSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      return Number(value);
    }
    return value;
  },
  z.number().min(0).max(100)
);

const heatSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    return value;
  },
  z.number().min(0).max(3).optional()
);

const sourceUrlSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'string' && value.trim().length === 0) {
      return undefined;
    }
    return value;
  },
  z.string().url().optional()
);

const initialApplicationSchema = z
  .object({
    tailoringScore: scoreSchema,
    cvVersionId: z.string().optional(),
    dateSent: isoDateOptional
  })
  .optional();

const schema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  sourceUrl: sourceUrlSchema,
  heat: heatSchema,
  stage: z.nativeEnum(JobStage).optional(),
  initialOutreach: createJobOutreachSchema.optional(),
  initialApplication: initialApplicationSchema
});

export class CreateJobDto extends createZodDto(schema) {}
