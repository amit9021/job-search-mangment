import { ContactStrength } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const includeArchivedSchema = z.preprocess((value) => {
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
}, z.boolean().optional());

const schema = z.object({
  query: z.string().optional(), // Search across name, role, email, linkedinUrl, githubUrl
  strength: z.nativeEnum(ContactStrength).optional(),
  companyId: z.string().optional(),
  includeArchived: includeArchivedSchema,
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  tags: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.flatMap((entry) =>
        typeof entry === 'string'
          ? entry
              .split(',')
              .map((token) => token.trim())
              .filter((token) => token.length > 0)
          : []
      );
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    }
    return undefined;
  }, z.array(z.string()).max(10).optional()),
  lastTouch: z.enum(['7d', '30d', 'stale', 'never']).optional()
});

export class ListContactsQueryDto extends createZodDto(schema) {
  declare query?: string;
  declare strength?: ContactStrength;
  declare companyId?: string;
  declare includeArchived?: boolean;
  declare page?: number;
  declare pageSize?: number;
  declare tags?: string[];
  declare lastTouch?: '7d' | '30d' | 'stale' | 'never';
}
