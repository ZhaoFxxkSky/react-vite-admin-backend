import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

function stripNulls<T>(value: T): T {
  if (value === null) return undefined as T;
  if (Array.isArray(value)) return value.map((v) => stripNulls(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripNulls(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out as T;
  }
  return value;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' && metadata.type !== 'query') return value;

    const result = this.schema.safeParse(value);
    if (!result.success) {
      const messages = result.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      throw new BadRequestException(messages);
    }
    return stripNulls(result.data);
  }
}
