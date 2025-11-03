import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';

export const outreachAutomationSchema = z.object({
  outreachId: z.string().cuid().optional(),
  contactId: z.string().cuid().optional(),
  jobId: z.string().cuid().optional(),
  outcome: z.string().optional()
});

export class OutreachAutomationDto extends createZodDto(outreachAutomationSchema) {}

export type OutreachAutomationInput = z.infer<typeof outreachAutomationSchema>;
