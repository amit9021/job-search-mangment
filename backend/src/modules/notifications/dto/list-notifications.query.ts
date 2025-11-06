import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  scope: z.enum(['today', 'upcoming', 'overdue']).default('today')
});

export class ListNotificationsQueryDto extends createZodDto(schema) {}
