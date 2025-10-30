import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

const schema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal(''))
});

export class UpdateCompanyDto extends createZodDto(schema) {}
