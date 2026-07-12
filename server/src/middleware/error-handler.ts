// Central error-handling middleware. Never leaks stack traces or DB details in
// production.

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/http-error.js';
import { isProd } from '../config/env.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { message: err.message, code: err.code, details: err.details },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint, FK violation, etc. — map to 409 without leaking SQL.
    const status = err.code === 'P2002' ? 409 : 400;
    res.status(status).json({
      error: {
        message:
          err.code === 'P2002'
            ? 'A record with these values already exists.'
            : 'Database request could not be completed.',
        code: `PRISMA_${err.code}`,
      },
    });
    return;
  }

  // Unknown error — log server-side, return generic message.
  console.error('[unhandled]', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL',
      ...(isProd ? {} : { details: String(err instanceof Error ? err.stack : err) }),
    },
  });
};

/** Wrap async route handlers so thrown/rejected errors reach the error handler. */
export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
