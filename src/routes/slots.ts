import { Router } from 'express';
import { z } from 'zod';
import { VehicleType, SlotStatus, SessionStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
export const slotsRouter = Router();

async function resolveLocationId(siteIdentifier?: string): Promise<string | undefined> {
  if (!siteIdentifier) return undefined;
  const isUuid = siteIdentifier.length === 36 && siteIdentifier.includes('-');
  const loc = await prisma.location.findFirst({
    where: isUuid ? { id: siteIdentifier } : { code: siteIdentifier },
  });
  return loc?.id;
}

/**
 * GET /api/v1/slots
 * Returns all parking slots, optionally filtered by siteId
 */
slotsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const siteQuery = req.query.siteId as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    const slots = await prisma.slot.findMany({
      where: locationId ? { locationId } : undefined,
      include: {
        location: true,
        sessions: {
          where: { status: SessionStatus.ACTIVE },
          include: { vehicle: true },
          take: 1,
        },
      },
      orderBy: { locationCode: 'asc' },
    });

    const formatted = slots.map((s) => {
      const activeSession = s.sessions[0];
      const category: 'Car' | 'Scooter' = s.slotType === VehicleType.CAR ? 'Car' : 'Scooter';

      let status: 'Vacant' | 'Occupied' | 'Deactivated' = 'Vacant';
      if (s.status === SlotStatus.OCCUPIED) status = 'Occupied';
      else if (s.status === SlotStatus.OUT_OF_SERVICE) status = 'Deactivated';

      return {
        id: s.locationCode,
        dbId: s.id,
        siteId: s.location?.code ?? '',
        locationId: s.locationId,
        category,
        locationCode: s.locationCode,
        status,
        currentVehicleNumber: activeSession?.vehicle.vehicleNumber ?? null,
        currentSessionId: activeSession?.id ?? null,
        deactivationReason: s.deactivationReason ?? null,
        deactivatedAt: s.deactivatedAt?.toISOString() ?? null,
        deactivatedBy: s.deactivatedBy ?? null,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/slots/:id
 * Returns single slot details with audit history
 */
slotsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const isUuid = id.length === 36 && id.includes('-');
    const siteQuery = req.query.siteId as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    const slot = await prisma.slot.findFirst({
      where: isUuid
        ? { id }
        : locationId
        ? { locationCode: id, locationId }
        : { locationCode: id },
      include: {
        location: true,
        sessions: {
          include: { vehicle: true, bill: true },
          orderBy: { inTime: 'desc' },
          take: 20,
        },
        deactivationEvents: {
          orderBy: { actionedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!slot) {
      throw new AppError('Slot not found', 404);
    }

    const activeSession = slot.sessions.find((s) => s.status === SessionStatus.ACTIVE);
    const category: 'Car' | 'Scooter' = slot.slotType === VehicleType.CAR ? 'Car' : 'Scooter';

    let status: 'Vacant' | 'Occupied' | 'Deactivated' = 'Vacant';
    if (slot.status === SlotStatus.OCCUPIED) status = 'Occupied';
    else if (slot.status === SlotStatus.OUT_OF_SERVICE) status = 'Deactivated';

    res.json({
      id: slot.locationCode,
      dbId: slot.id,
      siteId: slot.location?.code ?? '',
      siteName: slot.location?.name ?? '',
      category,
      locationCode: slot.locationCode,
      status,
      currentVehicleNumber: activeSession?.vehicle.vehicleNumber ?? null,
      currentSessionId: activeSession?.id ?? null,
      deactivationReason: slot.deactivationReason ?? null,
      deactivatedAt: slot.deactivatedAt?.toISOString() ?? null,
      deactivatedBy: slot.deactivatedBy ?? null,
      deactivationEvents: slot.deactivationEvents.map((e) => ({
        id: e.id,
        slotId: slot.locationCode,
        siteId: slot.location?.code ?? '',
        action: e.action,
        reason: e.reason,
        actionedBy: e.actionedBy,
        actionedAt: e.actionedAt.toISOString(),
      })),
      recentSessions: slot.sessions.map((s) => ({
        id: s.id,
        vehicleNumber: s.vehicle.vehicleNumber,
        category: s.vehicle.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter',
        inTime: s.inTime.toISOString(),
        outTime: s.outTime?.toISOString() ?? null,
        durationMinutes: s.bill?.durationMinutes ?? null,
        amount: s.bill?.amount ? parseFloat(s.bill.amount.toString()) : null,
        status: s.status === SessionStatus.ACTIVE ? 'Active' : 'Completed',
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/slots
 * Adds a new parking slot
 */
slotsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      siteId: z.string().min(1),
      category: z.enum(['Car', 'Scooter']),
      locationCode: z.string().min(1),
    });

    const body = schema.parse(req.body);
    const locationId = await resolveLocationId(body.siteId);
    if (!locationId) throw new AppError('Site not found', 404);

    const slotType = body.category === 'Car' ? VehicleType.CAR : VehicleType.SCOOTER;

    const slot = await prisma.slot.create({
      data: {
        locationId,
        locationCode: body.locationCode.trim().toUpperCase(),
        slotType,
        status: SlotStatus.VACANT,
      },
      include: { location: true },
    });

    res.status(201).json({
      id: slot.locationCode,
      dbId: slot.id,
      siteId: slot.location?.code ?? body.siteId,
      category: body.category,
      locationCode: slot.locationCode,
      status: 'Vacant',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/slots/:id/status
 * Updates slot status (Vacant / Occupied / Deactivated)
 */
slotsRouter.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const isUuid = id.length === 36 && id.includes('-');
    const schema = z.object({
      siteId: z.string().optional(),
      status: z.enum(['Vacant', 'Occupied', 'Deactivated']),
      deactivationReason: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const locationId = await resolveLocationId(body.siteId);

    const slot = await prisma.slot.findFirst({
      where: isUuid
        ? { id }
        : locationId
        ? { locationCode: id, locationId }
        : { locationCode: id },
      include: { location: true },
    });

    if (!slot) throw new AppError('Slot not found', 404);

    const adminName = req.operator?.username ?? 'Admin';
    let dbStatus: SlotStatus;

    if (body.status === 'Occupied') dbStatus = SlotStatus.OCCUPIED;
    else if (body.status === 'Deactivated') dbStatus = SlotStatus.OUT_OF_SERVICE;
    else dbStatus = SlotStatus.VACANT;

    const isDeactivating = body.status === 'Deactivated';
    const isReactivating = slot.status === SlotStatus.OUT_OF_SERVICE && body.status !== 'Deactivated';

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.slot.update({
        where: { id: slot.id },
        data: {
          status: dbStatus,
          deactivationReason: isDeactivating ? body.deactivationReason ?? 'Maintenance' : isReactivating ? null : slot.deactivationReason,
          deactivatedAt: isDeactivating ? new Date() : isReactivating ? null : slot.deactivatedAt,
          deactivatedBy: isDeactivating ? adminName : isReactivating ? null : slot.deactivatedBy,
        },
      });

      if ((isDeactivating || isReactivating) && slot.locationId) {
        await tx.slotDeactivationEvent.create({
          data: {
            slotId: slot.id,
            locationId: slot.locationId,
            action: isDeactivating ? 'deactivate' : 'reactivate',
            reason: isDeactivating
              ? body.deactivationReason ?? 'Maintenance'
              : 'Slot reactivated and verified operational',
            actionedBy: adminName,
            actionedAt: new Date(),
          },
        });
      }

      return s;
    });

    res.json({
      id: updated.locationCode,
      dbId: updated.id,
      siteId: slot.location?.code ?? '',
      status: body.status,
      deactivationReason: updated.deactivationReason,
      deactivatedAt: updated.deactivatedAt?.toISOString() ?? null,
      deactivatedBy: updated.deactivatedBy,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/slots/:id/category
 * Reassigns slot category (Car / Scooter)
 */
slotsRouter.patch('/:id/category', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const isUuid = id.length === 36 && id.includes('-');
    const schema = z.object({
      siteId: z.string().optional(),
      category: z.enum(['Car', 'Scooter']),
    });

    const body = schema.parse(req.body);
    const locationId = await resolveLocationId(body.siteId);

    const slot = await prisma.slot.findFirst({
      where: isUuid
        ? { id }
        : locationId
        ? { locationCode: id, locationId }
        : { locationCode: id },
    });

    if (!slot) throw new AppError('Slot not found', 404);

    const updated = await prisma.slot.update({
      where: { id: slot.id },
      data: {
        slotType: body.category === 'Car' ? VehicleType.CAR : VehicleType.SCOOTER,
      },
    });

    res.json({
      id: updated.locationCode,
      dbId: updated.id,
      category: body.category,
    });
  } catch (err) {
    next(err);
  }
});
