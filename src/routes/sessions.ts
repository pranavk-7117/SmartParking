import { Router } from 'express';
import { z } from 'zod';
import {
  SessionStatus,
  SlotStatus,
  VehicleType,
  ParkingSession,
  Vehicle,
  Slot,
  Location,
  Bill,
} from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { paginationSchema } from '../lib/validation';

export const sessionsRouter = Router();

type SessionWithRelations = ParkingSession & {
  vehicle: Vehicle;
  slot: Slot & { location: Location | null };
  bill: Bill | null;
};

/** Resolves a siteId (UUID or code) to a Location.id UUID */
async function resolveLocationId(siteIdentifier?: string): Promise<string | undefined> {
  if (!siteIdentifier) return undefined;
  const isUuid = siteIdentifier.length === 36 && siteIdentifier.includes('-');
  const loc = await prisma.location.findFirst({
    where: isUuid ? { id: siteIdentifier } : { code: siteIdentifier },
  });
  return loc?.id;
}

async function findSession(id: string): Promise<SessionWithRelations | null> {
  return prisma.parkingSession.findUnique({
    where: { id },
    include: {
      vehicle: true,
      slot: { include: { location: true } },
      bill: true,
    },
  }) as Promise<SessionWithRelations | null>;
}

function mapSession(s: SessionWithRelations) {
  const category: 'Car' | 'Scooter' = s.vehicle.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
  let status: 'Active' | 'Completed' | 'Voided';
  if (s.status === SessionStatus.ACTIVE)    status = 'Active';
  else if ((s.status as string) === 'VOIDED') status = 'Voided';
  else                                       status = 'Completed';

  const amount      = s.bill?.amount      ? parseFloat(s.bill.amount.toString())      : null;
  const rateApplied = s.bill?.rateApplied ? parseFloat(s.bill.rateApplied.toString()) : undefined;

  return {
    // Frontend ParkingSession interface
    id: s.id,
    siteId: s.slot.location?.code ?? s.slot.locationId ?? '',
    siteName: s.slot.location?.name ?? '',
    vehicleNumber: s.vehicle.vehicleNumber,
    category,
    slotId: s.slot.locationCode,
    inTime: s.inTime.toISOString(),
    outTime: s.outTime?.toISOString() ?? null,
    durationMinutes: s.bill?.durationMinutes ?? (s.outTime ? Math.max(1, Math.round((s.outTime.getTime() - s.inTime.getTime()) / 60000)) : null),
    amount,
    rateApplied,
    status,

    // Android operator app backward-compatible fields
    session_id:  s.id,
    location_id: s.slot.locationId ?? '',
    vehicle_id:  s.vehicleId,
    vehicle_number: s.vehicle.vehicleNumber,
    vehicle_type:   s.vehicle.vehicleType,
    slot_id:   s.slotId,
    slot_code: s.slot.locationCode,
    in_time:   s.inTime.toISOString(),
  };
}

/**
 * GET /api/v1/sessions
 * Returns parking sessions filtered by status, siteId, or location_id.
 * Operators are automatically scoped to their assigned location.
 * Returns X-Total-Count header for pagination.
 */
sessionsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { limit, offset } = paginationSchema.parse(req.query);

    const statusParam = (req.query.status as string | undefined)?.toUpperCase();
    const siteQuery   = (req.query.siteId ?? req.query.location_id) as string | undefined;

    // Operators are always scoped to their assigned location — ignore siteId param
    let locationId: string | undefined;
    if (req.operator!.role === 'operator') {
      locationId = req.operator!.locationId ?? undefined;
    } else {
      locationId = await resolveLocationId(siteQuery);
    }

    let statusFilter: SessionStatus | undefined = undefined;
    if (statusParam === 'ACTIVE')    statusFilter = SessionStatus.ACTIVE;
    else if (statusParam === 'COMPLETED') statusFilter = SessionStatus.COMPLETED;
    // VOIDED is included in the filter when explicitly requested
    else if (statusParam === 'VOIDED') statusFilter = 'VOIDED' as SessionStatus;

    const where = {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(locationId ? { slot: { locationId } } : {}),
    };

    // Run count and data fetch in parallel for efficiency
    const [total, sessions] = await Promise.all([
      prisma.parkingSession.count({ where }),
      prisma.parkingSession.findMany({
        where,
        include: {
          vehicle: true,
          slot: { include: { location: true } },
          bill: true,
        },
        orderBy: { inTime: 'desc' },
        take:    limit,
        skip:    offset,
      }) as Promise<SessionWithRelations[]>,
    ]);

    res.setHeader('X-Total-Count', total);
    res.json(sessions.map(mapSession));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sessions/:id
 * Full session details. Operators may only view sessions at their assigned site.
 */
sessionsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const s  = await findSession(id);
    if (!s) throw new AppError('Session not found', 404);

    // assertSiteAccess equivalent for operators
    if (req.operator!.role === 'operator') {
      const operatorLocationId = req.operator!.locationId;
      if (s.slot.locationId !== operatorLocationId) {
        throw new AppError('You do not have access to this session', 403);
      }
    }

    const category: 'Car' | 'Scooter' = s.vehicle.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
    const status: 'Active' | 'Completed' | 'Voided' =
      s.status === SessionStatus.ACTIVE
        ? 'Active'
        : (s.status as string) === 'VOIDED'
        ? 'Voided'
        : 'Completed';

    const durationMinutes = s.bill?.durationMinutes ?? (s.outTime ? Math.max(1, Math.round((s.outTime.getTime() - s.inTime.getTime()) / 60000)) : 0);
    const amount           = s.bill?.amount      ? parseFloat(s.bill.amount.toString())      : 0;
    const rateApplied      = s.bill?.rateApplied ? parseFloat(s.bill.rateApplied.toString()) : 0;

    res.json({
      id: s.id,
      siteId:       s.slot.location?.code ?? '',
      siteName:     s.slot.location?.name ?? 'AeroPark Facility',
      siteAddress:  s.slot.location?.address ?? 'Pune, Maharashtra',
      gateInfo:     s.slot.location?.gateInfo ?? 'Main Entrance Gate',
      vehicleNumber: s.vehicle.vehicleNumber,
      category,
      slotId: s.slot.locationCode,
      inTime:  s.inTime.toISOString(),
      outTime: s.outTime?.toISOString() ?? null,
      durationMinutes,
      rateApplied,
      amount,
      status,
      receiptNumber: s.bill ? `RCP-${s.id.substring(0, 8).toUpperCase()}` : null,
      generatedOn:   s.bill?.generatedOn.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/sessions/:id/void
 * Admin-only. Soft-voids a session with a mandatory reason.
 * Sets status = VOIDED, frees the slot if still ACTIVE, records audit log.
 */
sessionsRouter.post('/:id/void', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const voidSchema = z.object({
      reason: z.string().min(1, 'A void reason is required').max(500),
    });
    const { reason } = voidSchema.parse(req.body);

    const session = await prisma.parkingSession.findUnique({
      where:   { id },
      include: { slot: true },
    });

    if (!session) throw new AppError('Session not found', 404);
    if ((session.status as string) === 'VOIDED') {
      throw new AppError('Session is already voided', 409);
    }

    const voidedAt = new Date();
    const voidedBy = req.operator!.username;

    await prisma.$transaction(async (tx) => {
      // Soft-void the session with audit trace
      await tx.parkingSession.update({
        where: { id },
        data: {
          status: SessionStatus.VOIDED,
          voidReason: reason,
          voidedAt,
          voidedBy,
        },
      });

      // Free the parking slot if it was still active
      if (session.status === SessionStatus.ACTIVE && session.slotId) {
        await tx.slot.update({
          where: { id: session.slotId },
          data: { status: SlotStatus.VACANT },
        });
      }
    });

    res.json({
      success:    true,
      sessionId:  id,
      status:     'VOIDED',
      voidReason: reason,
      voidedAt:   voidedAt.toISOString(),
      voidedBy,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/sessions/:id
 * Deprecated. Returns 405 Method Not Allowed per API contract.
 * Voiding must use POST /api/v1/sessions/:id/void instead.
 */
sessionsRouter.delete('/:id', (_req, res) => {
  res.status(405).json({
    error: 'Direct session deletion is deprecated. Use POST /api/v1/sessions/:id/void',
  });
});
