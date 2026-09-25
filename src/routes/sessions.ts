import { Router } from 'express';
import {
  PrismaClient,
  SessionStatus,
  VehicleType,
  ParkingSession,
  Vehicle,
  Slot,
  Location,
  Bill,
} from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
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
  const status: 'Active' | 'Completed' = s.status === SessionStatus.ACTIVE ? 'Active' : 'Completed';
  const amount = s.bill?.amount ? parseFloat(s.bill.amount.toString()) : null;
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
    session_id: s.id,
    location_id: s.slot.locationId ?? '',
    vehicle_id: s.vehicleId,
    vehicle_number: s.vehicle.vehicleNumber,
    vehicle_type: s.vehicle.vehicleType,
    slot_id: s.slotId,
    slot_code: s.slot.locationCode,
    in_time: s.inTime.toISOString(),
  };
}

/**
 * GET /api/v1/sessions
 * Returns parking sessions filtered by status, siteId, or location_id
 */
sessionsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const statusParam = (req.query.status as string | undefined)?.toUpperCase();
    const siteQuery = (req.query.siteId ?? req.query.location_id) as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    let statusFilter: SessionStatus | undefined = undefined;
    if (statusParam === 'ACTIVE') statusFilter = SessionStatus.ACTIVE;
    else if (statusParam === 'COMPLETED') statusFilter = SessionStatus.COMPLETED;

    const sessions = (await prisma.parkingSession.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(locationId ? { slot: { locationId } } : {}),
      },
      include: {
        vehicle: true,
        slot: { include: { location: true } },
        bill: true,
      },
      orderBy: { inTime: 'desc' },
    })) as SessionWithRelations[];

    res.json(sessions.map(mapSession));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sessions/:id
 * Full session details for inspection and thermal receipt generation
 */
sessionsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const s = await findSession(id);
    if (!s) throw new AppError('Session not found', 404);

    const category: 'Car' | 'Scooter' = s.vehicle.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
    const status: 'Active' | 'Completed' = s.status === SessionStatus.ACTIVE ? 'Active' : 'Completed';
    const durationMinutes = s.bill?.durationMinutes ?? (s.outTime ? Math.max(1, Math.round((s.outTime.getTime() - s.inTime.getTime()) / 60000)) : 0);
    const amount = s.bill?.amount ? parseFloat(s.bill.amount.toString()) : 0;
    const rateApplied = s.bill?.rateApplied ? parseFloat(s.bill.rateApplied.toString()) : 0;

    res.json({
      id: s.id,
      siteId: s.slot.location?.code ?? '',
      siteName: s.slot.location?.name ?? 'AeroPark Facility',
      siteAddress: s.slot.location?.address ?? 'Pune, Maharashtra',
      gateInfo: s.slot.location?.gateInfo ?? 'Terminal 2 • Gates 1 & 2',
      vehicleNumber: s.vehicle.vehicleNumber,
      category,
      slotId: s.slot.locationCode,
      inTime: s.inTime.toISOString(),
      outTime: s.outTime?.toISOString() ?? null,
      durationMinutes,
      rateApplied,
      amount,
      status,
      receiptNumber: s.bill ? `RCP-${s.id.substring(0, 8).toUpperCase()}` : null,
      generatedOn: s.bill?.generatedOn.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});
