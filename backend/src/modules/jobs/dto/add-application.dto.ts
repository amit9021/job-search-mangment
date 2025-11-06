import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  dateSent: z.string().datetime(),
  tailoringScore: z.number().min(0).max(100),
  cvVersionId: z.string().optional()
});

export class AddApplicationDto extends createZodDto(schema) {}
