import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  due: z.enum(['today', 'overdue', 'upcoming']).default('today')
});

export class FollowupQueryDto extends createZodDto(schema) {}
