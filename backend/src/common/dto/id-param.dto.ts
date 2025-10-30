import { z } from 'zod';
import { createZodDto } from '../../utils/create-zod-dto';

const schema = z.object({
  id: z.string().cuid()
});

export class IdParamDto extends createZodDto(schema) {}
