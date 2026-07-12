import type { ZodTypeAny, z } from 'zod';

/** Parse & validate a request body; throws ZodError caught by error handler. */
export function parseBody<T extends ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  return schema.parse(body);
}

export function parseQuery<T extends ZodTypeAny>(schema: T, query: unknown): z.infer<T> {
  return schema.parse(query);
}
