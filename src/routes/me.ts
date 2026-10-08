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

/**
 * GET /api/v1/me/today-summary
 * Real live daily metrics for today (entries, exits, currently parked, revenue)
 */
meRouter.get('/today-summary', requireAuth, async (req, res, next) => {
  try {
    const operator = await prisma.adminUser.findUnique({
      where: { id: req.operator!.id },
      select: { locationId: true },
    });

    const locationId = operator?.locationId;
    if (!locationId) {
      return res.json({
        entries: 0,
        exits: 0,
        currentlyParked: 0,
        todayRevenue: 0,
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Entries created today
    const entries = await prisma.parkingSession.count({
      where: {
        slot: { locationId },
        inTime: { gte: startOfDay },
      },
    });

    // Exits completed today
    const exits = await prisma.parkingSession.count({
      where: {
        slot: { locationId },
        status: 'COMPLETED',
        outTime: { gte: startOfDay },
      },
    });

    // Currently active parked vehicles
    const currentlyParked = await prisma.parkingSession.count({
      where: {
        slot: { locationId },
        status: 'ACTIVE',
      },
    });

    // Revenue collected today
    const bills = await prisma.bill.findMany({
      where: {
        session: {
          slot: { locationId },
        },
        generatedOn: { gte: startOfDay },
      },
      select: { amount: true },
    });

    const todayRevenue = bills.reduce((sum, b) => sum + Number(b.amount), 0);

    res.json({
      entries,
      exits,
      currentlyParked,
      todayRevenue: Math.round(todayRevenue),
    });
  } catch (err) {
    next(err);
  }
});

