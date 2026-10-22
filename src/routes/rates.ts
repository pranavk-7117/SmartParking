import { Router } from 'express';
import { z } from 'zod';
import { VehicleType } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
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
 * Returns rates, optionally filtered by siteId.
 * Operators are scoped to their assigned site.
 */
ratesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    let locationId: string | undefined;

    if (req.operator!.role.toUpperCase() === 'OPERATOR') {
      // Operators may only read rates for their assigned location
      locationId = req.operator!.locationId ?? undefined;
    } else {
      const siteQuery = req.query.siteId as string | undefined;
      locationId = await resolveLocationId(siteQuery);
    }

    const rates = await prisma.rateMaster.findMany({
      where:   locationId ? { locationId } : undefined,
      include: { location: true },
      orderBy: { vehicleType: 'asc' },
    });

    const formatted = rates.map((r) => {
      const category: 'Car' | 'Scooter' = r.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
      const hourlyRate = parseFloat(r.ratePerHour.toString());
      const siteCode   = r.location?.code ?? 'default';

      return {
        // Frontend RateItem fields
        id:           `rate-${siteCode}-${category.toLowerCase()}`,
        dbId:         r.id,
        siteId:       siteCode,
        locationId:   r.locationId,
        category,
        hourlyRate,
        lastUpdatedAt: r.createdAt.toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        lastUpdatedBy: r.lastUpdatedBy ?? 'Admin',

        // Android RateDto backward compatibility fields
        vehicle_type:   r.vehicleType,
        rate_per_hour:  hourlyRate,
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
 * Returns tariff change history audit logs.
 */
ratesRouter.get('/history', requireAuth, async (req, res, next) => {
  try {
    const siteQuery  = req.query.siteId as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    const history = await prisma.rateHistory.findMany({
      where:   locationId ? { locationId } : undefined,
      include: { location: true },
      orderBy: { createdAt: 'desc' },
      take:    50,
    });

    const formatted = history.map((h) => ({
      id:       h.id,
      siteId:   h.location.code,
      siteName: h.location.name,
      category: h.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter',
      oldRate:  parseFloat(h.oldRate.toString()),
      newRate:  parseFloat(h.newRate.toString()),
      changedBy: h.changedBy,
      date: h.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/rates
 * Updates a site's tariff and logs into audit history.
 * Admin-only. Accepts both frontend format ({category, newRate}) and DTO format ({vehicleType, ratePerHour}).
 */
ratesRouter.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      siteId:      z.string().min(1),
      category:    z.string().optional(),
      vehicleType: z.string().optional(),
      newRate:     z.number().positive().optional(),
      ratePerHour: z.number().positive().optional(),
    }).refine(
      (data) => (data.category || data.vehicleType) && (data.newRate !== undefined || data.ratePerHour !== undefined),
      { message: 'category/vehicleType and newRate/ratePerHour are required' }
    );

    const body       = schema.parse(req.body);
    const locationId = await resolveLocationId(body.siteId);
    if (!locationId) throw new AppError('Site not found', 404);

    const rawCategory = (body.category || body.vehicleType || '').toUpperCase();
    const vehicleType = rawCategory.includes('CAR') ? VehicleType.CAR : VehicleType.SCOOTER;
    const categoryName: 'Car' | 'Scooter' = vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
    const finalRate = Number(body.newRate !== undefined ? body.newRate : body.ratePerHour);

    // Always derive admin name from authenticated JWT
    const adminUser = req.operator?.username ?? 'admin';

    const existingRate = await prisma.rateMaster.findFirst({
      where: { locationId, vehicleType },
    });

    const oldRateVal = existingRate ? parseFloat(existingRate.ratePerHour.toString()) : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or create rate master
      const updated = await tx.rateMaster.upsert({
        where:  { locationId_vehicleType: { locationId, vehicleType } },
        update: { ratePerHour: finalRate, effectiveFrom: new Date(), lastUpdatedBy: adminUser },
        create: { locationId, vehicleType, ratePerHour: finalRate, effectiveFrom: new Date(), lastUpdatedBy: adminUser },
        include: { location: true },
      });

      // 2. Add history audit entry
      await tx.rateHistory.create({
        data: { locationId, vehicleType, oldRate: oldRateVal, newRate: finalRate, changedBy: adminUser },
      });

      // 3. Keep location table default rates in sync
      if (vehicleType === VehicleType.CAR) {
        await tx.location.update({
          where: { id: locationId },
          data: { defaultCarRate: finalRate },
        });
      } else {
        await tx.location.update({
          where: { id: locationId },
          data: { defaultScooterRate: finalRate },
        });
      }

      return updated;
    });

    res.json({
      id:           `rate-${body.siteId}-${categoryName.toLowerCase()}`,
      dbId:         result.id,
      siteId:       body.siteId,
      category:     categoryName,
      hourlyRate:   finalRate,
      lastUpdatedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      lastUpdatedBy: adminUser,
    });
  } catch (err) {
    next(err);
  }
});
