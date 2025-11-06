import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';
import { createJobOutreachSchema } from '../../jobs/dto/create-job-outreach.dto';

const createOutreachSchema = createJobOutreachSchema.and(
  z.object({
    jobId: z.string().cuid()
  })
);

export class CreateOutreachDto extends createZodDto(createOutreachSchema) {}

export type CreateOutreachInput = z.infer<typeof createOutreachSchema>;
