import { Router } from 'express';
import { VehicleType, SlotStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export const displayRouter = Router();

/**
 * GET /api/v1/display
 * Returns availability for the primary active site along with a list of all active sites.
 */
displayRouter.get('/', async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      where: { status: 'Active' },
      include: { slots: true, rates: true },
      orderBy: { createdAt: 'asc' },
    });

    if (locations.length === 0) {
      return res.status(404).json({ error: 'No active parking sites found' });
    }

    const primaryLocation = locations[0];
    const primaryAvailability = calculateAvailability(primaryLocation);

    const allSites = locations.map((loc) => calculateAvailability(loc));

    return res.json({
      ...primaryAvailability,
      allSites,
    });
  } catch (err) {
    next(err);
  }
});

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
      include: { slots: true, rates: true },
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
  const carRate = location.rates?.find((rate: any) => rate.vehicleType === VehicleType.CAR)?.ratePerHour
    ?? location.defaultCarRate
    ?? 30;
  const scooterRate = location.rates?.find((rate: any) => rate.vehicleType === VehicleType.SCOOTER)?.ratePerHour
    ?? location.defaultScooterRate
    ?? 15;

  const carAvailable     = carSlots.filter((s: any)     => s.status === SlotStatus.VACANT).length;
  const scooterAvailable = scooterSlots.filter((s: any) => s.status === SlotStatus.VACANT).length;
  const totalAvailable   = carAvailable + scooterAvailable;
  const totalSlots       = carSlots.length + scooterSlots.length;

  return {
    siteId:          location.code,
    siteName:        location.name,
    address:         location.address ?? `${location.name}, ${location.city}`,
    latitude:        location.latitude,
    longitude:       location.longitude,
    carHourlyRate:   Number(carRate),
    scooterHourlyRate: Number(scooterRate),
    availableSpots:  location.slots
      .filter((slot: any) => slot.status === SlotStatus.VACANT)
      .map((slot: any) => ({
        locationCode: slot.locationCode,
        category: slot.slotType === VehicleType.CAR ? 'Car' : 'Scooter',
      })),
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
