import { ContactStrength } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const includeArchivedSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return value;
  },
  z.boolean().optional()
);

const schema = z.object({
  query: z.string().optional(), // Search across name, role, email, linkedinUrl, githubUrl
  strength: z.nativeEnum(ContactStrength).optional(),
  companyId: z.string().optional(),
  includeArchived: includeArchivedSchema,
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
});

export class ListContactsQueryDto extends createZodDto(schema) {}
