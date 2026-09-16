import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
export const ratesRouter = Router();

/**
 * GET /api/v1/rates
 * Returns all rate_master rows (CAR + SCOOTER hourly tariffs).
 */
ratesRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rates = await prisma.rateMaster.findMany({ orderBy: { vehicleType: 'asc' } });

    const response = rates.map((r) => ({
      vehicle_type:   r.vehicleType,
      rate_per_hour:  parseFloat(r.ratePerHour.toString()),
      effective_from: r.effectiveFrom.toISOString().substring(0, 10), // YYYY-MM-DD
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
});
