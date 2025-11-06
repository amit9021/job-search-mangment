import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  note: z.string().optional()
});

export class SendFollowupDto extends createZodDto(schema) {}
