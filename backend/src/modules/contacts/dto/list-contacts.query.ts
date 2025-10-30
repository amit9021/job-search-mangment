import { ContactStrength } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  strength: z.nativeEnum(ContactStrength).optional()
});

export class ListContactsQueryDto extends createZodDto(schema) {}
