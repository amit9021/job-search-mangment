import { ContactStrength } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1).optional(),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional(), // Auto-creates company if provided
  role: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z
    .string()
    .regex(/^[\d\s+()-]*$/)
    .optional()
    .or(z.literal(''))
    .nullable(),
  linkedinUrl: z.string().url().optional().or(z.literal('')).nullable(),
  githubUrl: z.string().url().optional().or(z.literal('')).nullable(),
  location: z.string().max(200).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  notes: z.string().optional().nullable(),
  strength: z.nativeEnum(ContactStrength).optional()
});

export class UpdateContactDto extends createZodDto(schema) {}
