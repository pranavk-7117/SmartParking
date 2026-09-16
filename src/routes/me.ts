import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
export const meRouter = Router();

/**
 * GET /api/v1/me/assignment
 * Returns the operator's assigned location for today.
 * Location is encoded in the JWT's `locationId` claim.
 */
meRouter.get('/assignment', requireAuth, async (req, res, next) => {
  try {
    const locationId = req.operator!.locationId;
    if (!locationId) {
      throw new AppError('No location assignment found for this operator', 404);
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new AppError('Assigned location not found', 404);
    }

    res.json({
      location_id: location.id,
      location_name: location.name,
      location_code: location.code,
      city: location.city,
    });
  } catch (err) {
    next(err);
  }
});
