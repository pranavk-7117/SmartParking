import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  // ── Zod validation error → 400 Bad Request ────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // ── Prisma known errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        res.status(409).json({ error: 'Conflict: a record with that value already exists', code: err.code });
        return;
      case 'P2025': // Record not found
        res.status(404).json({ error: 'Not found', code: err.code });
        return;
      case 'P2003': // Foreign key constraint
        res.status(409).json({ error: 'Conflict: foreign key constraint failed', code: err.code });
        return;
    }
  }

  // ── Generic application errors with a statusCode property ─────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // ── Fallback: 500 Internal Server Error ───────────────────────────────────
  const incidentId = randomUUID();

  // Always log the full error server-side with the incident ID for traceability
  console.error(`[error][${incidentId}]`, err);

  if (isProduction) {
    // In production: mask stack traces and internal details from the client
    res.status(500).json({
      error: 'An unexpected internal error occurred',
      incidentId,
    });
  } else {
    // In development: include the message for easier debugging
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message, incidentId });
  }
}

/** Lightweight typed error class for explicit HTTP status codes. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}
