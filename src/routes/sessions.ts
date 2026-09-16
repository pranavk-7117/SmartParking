import { Router } from 'express';
import { PrismaClient, SessionStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
export const sessionsRouter = Router();

/**
 * GET /api/v1/sessions?status=ACTIVE&location_id=<uuid>
 * Returns parking sessions filtered by status and location.
 */
sessionsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const statusParam   = (req.query.status as string | undefined)?.toUpperCase() ?? 'ACTIVE';
    const locationId    = req.query.location_id as string | undefined;

    // Validate status enum
    const status = statusParam === 'COMPLETED' ? SessionStatus.COMPLETED : SessionStatus.ACTIVE;

    const sessions = await prisma.parkingSession.findMany({
      where: {
        status,
        // If location_id supplied, filter to sessions whose slot belongs to that location
        ...(locationId ? { slot: { locationId } } : {}),
      },
      include: {
        vehicle: true,
        slot: true,
      },
      orderBy: { inTime: 'asc' },
    });

    const response = sessions.map((s) => ({
      session_id:     s.id,
      location_id:    s.slot.locationId ?? '',
      vehicle_id:     s.vehicleId,
      vehicle_number: s.vehicle.vehicleNumber,
      vehicle_type:   s.vehicle.vehicleType,
      slot_id:        s.slotId,
      slot_code:      s.slot.locationCode,
      in_time:        s.inTime.toISOString(),
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
});
