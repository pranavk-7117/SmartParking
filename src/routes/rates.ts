import { Router } from 'express';
import { z } from 'zod';
import { VehicleType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

export const ratesRouter = Router();

async function resolveLocationId(siteIdentifier?: string): Promise<string | undefined> {
  if (!siteIdentifier) return undefined;
  const loc = await prisma.location.findFirst({
    where: {
      OR: [
        { id: siteIdentifier.includes('-') && siteIdentifier.length === 36 ? siteIdentifier : undefined },
        { code: siteIdentifier },
      ],
    },
  });
  return loc?.id;
}

/**
 * GET /api/v1/rates
 * Returns rates, optionally filtered by siteId
 */
ratesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const siteQuery = req.query.siteId as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    const rates = await prisma.rateMaster.findMany({
      where: locationId ? { locationId } : undefined,
      include: { location: true },
      orderBy: { vehicleType: 'asc' },
    });

    // If query has siteId or headers accept frontend format, return RateItem[]
    const formatted = rates.map((r) => {
      const category: 'Car' | 'Scooter' = r.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
      const hourlyRate = parseFloat(r.ratePerHour.toString());
      const siteCode = r.location?.code ?? 'default';

      return {
        // Frontend RateItem fields
        id: `rate-${siteCode}-${category.toLowerCase()}`,
        dbId: r.id,
        siteId: siteCode,
        locationId: r.locationId,
        category,
        hourlyRate,
        lastUpdatedAt: r.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        lastUpdatedBy: r.lastUpdatedBy ?? 'Admin',

        // Android RateDto backward compatibility fields
        vehicle_type: r.vehicleType,
        rate_per_hour: hourlyRate,
        effective_from: r.effectiveFrom.toISOString().substring(0, 10),
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/rates/history
 * Returns tariff change history audit logs
 */
ratesRouter.get('/history', requireAuth, async (req, res, next) => {
  try {
    const siteQuery = req.query.siteId as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    const history = await prisma.rateHistory.findMany({
      where: locationId ? { locationId } : undefined,
      include: { location: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = history.map((h) => ({
      id: h.id,
      siteId: h.location.code,
      siteName: h.location.name,
      category: h.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter',
      oldRate: parseFloat(h.oldRate.toString()),
      newRate: parseFloat(h.newRate.toString()),
      changedBy: h.changedBy,
      date: h.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/rates
 * Updates a site's tariff and logs into audit history
 */
ratesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      siteId: z.string().min(1),
      category: z.enum(['Car', 'Scooter']),
      newRate: z.number().min(1),
      adminName: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const locationId = await resolveLocationId(body.siteId);
    if (!locationId) throw new AppError('Site not found', 404);

    const vehicleType = body.category === 'Car' ? VehicleType.CAR : VehicleType.SCOOTER;
    const adminUser = body.adminName ?? req.operator?.username ?? 'Admin';

    const existingRate = await prisma.rateMaster.findFirst({
      where: { locationId, vehicleType },
    });

    const oldRateVal = existingRate ? parseFloat(existingRate.ratePerHour.toString()) : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or create rate master
      const updated = await tx.rateMaster.upsert({
        where: {
          locationId_vehicleType: {
            locationId,
            vehicleType,
          },
        },
        update: {
          ratePerHour: body.newRate,
          effectiveFrom: new Date(),
          lastUpdatedBy: adminUser,
        },
        create: {
          locationId,
          vehicleType,
          ratePerHour: body.newRate,
          effectiveFrom: new Date(),
          lastUpdatedBy: adminUser,
        },
        include: { location: true },
      });

      // 2. Add history audit entry
      await tx.rateHistory.create({
        data: {
          locationId,
          vehicleType,
          oldRate: oldRateVal,
          newRate: body.newRate,
          changedBy: adminUser,
        },
      });

      return updated;
    });

    res.json({
      id: `rate-${body.siteId}-${body.category.toLowerCase()}`,
      dbId: result.id,
      siteId: body.siteId,
      category: body.category,
      hourlyRate: body.newRate,
      lastUpdatedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      lastUpdatedBy: adminUser,
    });
  } catch (err) {
    next(err);
  }
});
