import { z } from 'zod';

type ZodDtoConstructor<TSchema extends z.ZodTypeAny> = {
  new (payload?: z.infer<TSchema>): z.infer<TSchema>;
  zodSchema: TSchema;
};

export function createZodDto<TSchema extends z.ZodTypeAny>(schema: TSchema): ZodDtoConstructor<TSchema> {
  class ZodDtoClass {
    static zodSchema = schema;

    constructor(payload?: z.infer<TSchema>) {
      if (payload) {
        Object.assign(this, payload);
      }
    }
  }

  return ZodDtoClass as unknown as ZodDtoConstructor<TSchema>;
}

export const idParamSchema = z.object({
  id: z.string().cuid()
});

export type InferDto<T> = T extends { zodSchema: infer Schema } ? Schema extends z.ZodTypeAny ? z.infer<Schema> : never : never;
