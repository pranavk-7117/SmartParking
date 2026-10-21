/**
 * src/lib/validation.ts
 * Centralised Zod schemas and validation helpers for Part B hardening.
 */
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .default(50)
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(1).max(200)),
  offset: z
    .union([z.string(), z.number()])
    .optional()
    .default(0)
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(0)),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ── Vehicle Plate ─────────────────────────────────────────────────────────────

/**
 * Indian vehicle registration plate regex.
 * Format: 2 letters (state code) + 1-2 digits (district) + 1-3 letters (series) + 4 digits (number)
 * e.g. KA01AB1234, MH12AB1234, DL3CAB1234
 */
export const PLATE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;

export const vehiclePlateSchema = z
  .string()
  .min(4)
  .max(15)
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .pipe(
    z.string().regex(PLATE_REGEX, {
      message:
        'Vehicle plate must match Indian registration format (e.g. KA01AB1234)',
    })
  );

// ── Timestamp Bounds ──────────────────────────────────────────────────────────

const FIVE_MINUTES_MS  = 5  * 60 * 1_000;
const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1_000;

/**
 * Validates that a device_timestamp is:
 *  - Not more than 5 minutes in the future (clock skew allowance)
 *  - Not more than 24 hours in the past (stale offline capture)
 *
 * Throws AppError(400) on violation.
 */
export function validateTimestampBounds(deviceTimestamp: Date): void {
  const now     = Date.now();
  const tsMs    = deviceTimestamp.getTime();
  const diffMs  = tsMs - now;

  if (diffMs > FIVE_MINUTES_MS) {
    throw new AppError(
      `device_timestamp is more than 5 minutes in the future (${Math.round(diffMs / 60_000)} min ahead)`,
      400
    );
  }

  if (now - tsMs > TWENTY_FOUR_H_MS) {
    throw new AppError(
      'device_timestamp is more than 24 hours in the past',
      400
    );
  }
}

/**
 * Zod string datetime schema with built-in timestamp bounds validation.
 * Use in route body schemas when you need both ISO format check + bounds check.
 */
export const deviceTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine(
    (val) => {
      const ts  = new Date(val);
      const now = Date.now();
      const tsMs = ts.getTime();
      return tsMs - now <= FIVE_MINUTES_MS && now - tsMs <= TWENTY_FOUR_H_MS;
    },
    {
      message:
        'device_timestamp must be within the last 24 hours and no more than 5 minutes in the future',
    }
  );
