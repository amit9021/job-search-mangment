import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export class LoginDto extends createZodDto(schema) {}
