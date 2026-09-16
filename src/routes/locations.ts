import { Router } from 'express';
import { PrismaClient, VehicleType, SlotStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
export const locationsRouter = Router();

/**
 * GET /api/v1/locations/:id/availability
 * Returns live slot availability counts for a specific location.
 */
locationsRouter.get('/:id/availability', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify location exists
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      throw new AppError('Location not found', 404);
    }

    // Aggregate slot counts by type and status for this location
    const slots = await prisma.slot.groupBy({
      by: ['slotType', 'status'],
      where: { locationId: id },
      _count: { id: true },
    });

    // Build counts with defaults of 0
    const countMap: Record<string, Record<string, number>> = {};
    for (const row of slots) {
      if (!countMap[row.slotType]) countMap[row.slotType] = {};
      countMap[row.slotType][row.status] = row._count.id;
    }

    const carVacant    = countMap[VehicleType.CAR]?.[SlotStatus.VACANT]    ?? 0;
    const carOccupied  = countMap[VehicleType.CAR]?.[SlotStatus.OCCUPIED]  ?? 0;
    const scooterVacant   = countMap[VehicleType.SCOOTER]?.[SlotStatus.VACANT]   ?? 0;
    const scooterOccupied = countMap[VehicleType.SCOOTER]?.[SlotStatus.OCCUPIED] ?? 0;

    res.json({
      location_id:      id,
      car_vacant:       carVacant,
      car_occupied:     carOccupied,
      scooter_vacant:   scooterVacant,
      scooter_occupied: scooterOccupied,
      total_vacant:     carVacant + scooterVacant,
      total_occupied:   carOccupied + scooterOccupied,
    });
  } catch (err) {
    next(err);
  }
});
