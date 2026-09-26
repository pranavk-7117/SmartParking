import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

export const meRouter = Router();

/**
 * GET /api/v1/me/assignment
 * Returns the operator's assigned location for today.
 * Location is encoded in the JWT's `locationId` claim.
 */
meRouter.get('/assignment', requireAuth, async (req, res, next) => {
  try {
    const operator = await prisma.adminUser.findUnique({
      where: { id: req.operator!.id },
      include: { location: true },
    });

    if (!operator || !operator.location) {
      throw new AppError('No location assignment found for this operator', 404);
    }

    const location = operator.location;

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
