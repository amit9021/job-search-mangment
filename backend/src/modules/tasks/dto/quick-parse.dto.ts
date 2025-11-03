import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

export const quickParseSchema = z.object({
  text: z.string().min(1)
});

export class QuickParseDto extends createZodDto(quickParseSchema) {}

export type QuickParseInput = z.infer<typeof quickParseSchema>;
