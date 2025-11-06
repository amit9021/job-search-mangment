import { ContactStrength } from '@prisma/client';
import { z } from 'zod';

import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1),
  companyId: z.string().optional(),
  companyName: z.string().optional(), // Auto-creates company if provided
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\d\s+()-]*$/)
    .optional()
    .or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  location: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  notes: z.string().optional(),
  strength: z.nativeEnum(ContactStrength).optional()
});

export class CreateContactDto extends createZodDto(schema) {}
