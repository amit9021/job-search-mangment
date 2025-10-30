import { JobStage } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  stage: z.nativeEnum(JobStage).optional(),
  heat: z
    .preprocess((val) => (val === undefined ? undefined : Number(val)), z.number().min(0).max(3).optional())
});

export class ListJobsQueryDto extends createZodDto(schema) {}
