import { Router } from 'express';
import { VehicleType, SlotStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export const displayRouter = Router();

/**
 * GET /api/v1/display/:siteId
 * Public endpoint for Kiosk Display billboard.
 * No authentication required.
 *
 * Security hardening (Part B):
 *  - Silent fallback REMOVED: if siteId is unknown or the location is not Active,
 *    returns 404 Not Found with the siteId in the response for debugging.
 *  - Rate limited to 120 req/min per IP (applied in app.ts, not here).
 */
displayRouter.get('/:siteId', async (req, res, next) => {
  try {
    const { siteId } = req.params;

    const location = await prisma.location.findFirst({
      where: {
        OR: [
          { id:   siteId.includes('-') && siteId.length === 36 ? siteId : undefined },
          { code: siteId },
        ],
      },
      include: { slots: true },
    });

    // 404 if site not found — silent fallback deliberately removed
    if (!location) {
      return res.status(404).json({
        error:  'Parking site not found or inactive',
        siteId,
      });
    }

    // 404 if site exists but is not Active (e.g. 'Coming Soon')
    if (location.status !== 'Active') {
      return res.status(404).json({
        error:  'Parking site not found or inactive',
        siteId,
      });
    }

    return res.json(calculateAvailability(location));
  } catch (err) {
    next(err);
  }
});

function calculateAvailability(location: any) {
  const carSlots     = location.slots.filter((s: any) => s.slotType === VehicleType.CAR);
  const scooterSlots = location.slots.filter((s: any) => s.slotType === VehicleType.SCOOTER);

  const carAvailable     = carSlots.filter((s: any)     => s.status === SlotStatus.VACANT).length;
  const scooterAvailable = scooterSlots.filter((s: any) => s.status === SlotStatus.VACANT).length;
  const totalAvailable   = carAvailable + scooterAvailable;
  const totalSlots       = carSlots.length + scooterSlots.length;

  return {
    siteId:          location.code,
    siteName:        location.name,
    carAvailable,
    carTotal:        carSlots.length,
    scooterAvailable,
    scooterTotal:    scooterSlots.length,
    totalAvailable,
    totalSlots,
    isFacilityFull:  totalAvailable === 0,
    updatedAt:       new Date().toISOString(),
  };
}
