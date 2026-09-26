import { Router } from 'express';
import { VehicleType, SlotStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export const displayRouter = Router();

/**
 * GET /api/v1/display/:siteId
 * Public endpoint for Kiosk Display billboard
 */
displayRouter.get('/:siteId', async (req, res, next) => {
  try {
    const { siteId } = req.params;

    const location = await prisma.location.findFirst({
      where: {
        OR: [
          { id: siteId.includes('-') && siteId.length === 36 ? siteId : undefined },
          { code: siteId },
        ],
      },
      include: {
        slots: true,
      },
    });

    if (!location) {
      // Fallback to first available active location
      const fallback = await prisma.location.findFirst({
        where: { status: 'Active' },
        include: { slots: true },
      });

      if (!fallback) {
        return res.status(404).json({ error: 'No parking site available' });
      }

      return res.json(calculateAvailability(fallback));
    }

    return res.json(calculateAvailability(location));
  } catch (err) {
    next(err);
  }
});

function calculateAvailability(location: any) {
  const carSlots = location.slots.filter((s: any) => s.slotType === VehicleType.CAR);
  const scooterSlots = location.slots.filter((s: any) => s.slotType === VehicleType.SCOOTER);

  const carAvailable = carSlots.filter((s: any) => s.status === SlotStatus.VACANT).length;
  const scooterAvailable = scooterSlots.filter((s: any) => s.status === SlotStatus.VACANT).length;
  const totalAvailable = carAvailable + scooterAvailable;
  const totalSlots = carSlots.length + scooterSlots.length;

  return {
    siteId: location.code,
    siteName: location.name,
    carAvailable,
    carTotal: carSlots.length,
    scooterAvailable,
    scooterTotal: scooterSlots.length,
    totalAvailable,
    totalSlots,
    isFacilityFull: totalAvailable === 0,
    updatedAt: new Date().toISOString(),
  };
}
