import { JobStage } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  stage: z.nativeEnum(JobStage),
  note: z.string().optional()
});

export class UpdateJobStageDto extends createZodDto(schema) {}
