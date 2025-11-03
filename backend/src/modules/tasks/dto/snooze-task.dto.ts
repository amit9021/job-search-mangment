import { z } from 'zod';
import { createZodDto } from '../../../utils/create-zod-dto';
import { SNOOZE_PRESETS } from '../task.constants';

export const snoozeTaskSchema = z.object({
  preset: z.enum(SNOOZE_PRESETS)
});

export class SnoozeTaskDto extends createZodDto(snoozeTaskSchema) {}

export type SnoozeTaskInput = z.infer<typeof snoozeTaskSchema>;
