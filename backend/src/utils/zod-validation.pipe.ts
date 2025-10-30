import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const schema: z.ZodTypeAny | undefined = (metadata.metatype as any)?.zodSchema;
    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new BadRequestException(result.error.flatten());
  }
}
