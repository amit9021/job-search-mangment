import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Email required')
    .email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters')
});

export class RegisterDto extends createZodDto(schema) {}
