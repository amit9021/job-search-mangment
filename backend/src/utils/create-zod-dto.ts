import { z } from 'zod';

type ZodShape = Record<string, z.ZodTypeAny>;

export function createZodDto<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  class ZodDtoClass {
    static zodSchema = schema;

    constructor(payload: z.infer<typeof schema>) {
      Object.assign(this, payload);
    }
  }

  return ZodDtoClass;
}

export const idParamSchema = z.object({
  id: z.string().cuid()
});

export type InferDto<T> = T extends { zodSchema: infer Schema } ? Schema extends z.ZodTypeAny ? z.infer<Schema> : never : never;
