import { Router } from 'express';
import { z } from 'zod';
import { VehicleType, SlotStatus, SessionStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
export const entriesRouter = Router();

const entrySchema = z.object({
  idempotency_key:  z.string().uuid('idempotency_key must be a valid UUID'),
  location_id:      z.string().uuid('location_id must be a valid UUID'),
  vehicle_number:   z.string().min(4).max(15).transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  vehicle_type:     z.enum(['CAR', 'SCOOTER']),
  slot_id:          z.string().uuid().nullable().optional(),
  device_timestamp: z.string().datetime({ offset: true }),
  captured_offline: z.boolean(),
});

/**
 * POST /api/v1/entries
 * Records a vehicle entry with full idempotency guarantee.
 *
 * Idempotency: if a session already exists with this idempotency_key
 * (stored as the session id), return 200 + original session data.
 *
 * On first call:
 *  1. Upsert vehicle by vehicle_number
 *  2. Allocate a vacant slot (specified or auto-selected)
 *  3. Inside a transaction: mark slot OCCUPIED + create ParkingSession
 *
 * Returns 201 on creation, 200 on idempotent replay.
 */
entriesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = entrySchema.parse(req.body);

    // ── Idempotency Check ───────────────────────────────────────────────────
    // We use the idempotency_key as the session ID for perfect replay semantics
    const existing = await prisma.parkingSession.findUnique({
      where:   { id: body.idempotency_key },
      include: { vehicle: true, slot: true },
    });

    if (existing) {
      return res.status(200).json({
        session_id:        existing.id,
        vehicle_id:        existing.vehicleId,
        vehicle_number:    existing.vehicle.vehicleNumber,
        vehicle_type:      existing.vehicle.vehicleType,
        slot_id:           existing.slotId,
        slot_location_code: existing.slot.locationCode,
        in_time:           existing.inTime.toISOString(),
        status:            existing.status,
        captured_offline:  body.captured_offline,
      });
    }

    // ── Resolve Slot ────────────────────────────────────────────────────────
    let slot;
    if (body.slot_id) {
      // Operator specified a slot — validate it
      slot = await prisma.slot.findUnique({ where: { id: body.slot_id } });
      if (!slot) throw new AppError(`Slot ${body.slot_id} not found`, 404);
      if (slot.status !== SlotStatus.VACANT) throw new AppError(`Slot ${slot.locationCode} is not vacant`, 409);
      if (slot.slotType !== (body.vehicle_type as VehicleType)) {
        throw new AppError(`Slot type mismatch: slot is for ${slot.slotType}`, 409);
      }
    } else {
      // Auto-allocate first vacant slot of the right type in this location
      slot = await prisma.slot.findFirst({
        where: {
          locationId: body.location_id,
          slotType:   body.vehicle_type as VehicleType,
          status:     SlotStatus.VACANT,
        },
        orderBy: { locationCode: 'asc' },
      });
      if (!slot) throw new AppError(`No vacant ${body.vehicle_type} slot available`, 409);
    }

    const inTime = new Date(body.device_timestamp);

    // ── Atomic Transaction ──────────────────────────────────────────────────
    const [session, vehicle] = await prisma.$transaction(async (tx) => {
      // 1. Upsert vehicle
      const v = await tx.vehicle.upsert({
        where:  { vehicleNumber: body.vehicle_number },
        create: { vehicleNumber: body.vehicle_number, vehicleType: body.vehicle_type as VehicleType },
        update: {},                 // If already known, don't change anything
      });

      // 2. Mark slot OCCUPIED
      await tx.slot.update({
        where: { id: slot!.id },
        data:  { status: SlotStatus.OCCUPIED },
      });

      // 3. Create session (id = idempotency_key for deterministic replay)
      const s = await tx.parkingSession.create({
        data: {
          id:        body.idempotency_key,
          vehicleId: v.id,
          slotId:    slot!.id,
          inTime,
          status:    SessionStatus.ACTIVE,
        },
      });

      return [s, v];
    });

    return res.status(201).json({
      session_id:         session.id,
      vehicle_id:         vehicle.id,
      vehicle_number:     vehicle.vehicleNumber,
      vehicle_type:       vehicle.vehicleType,
      slot_id:            slot.id,
      slot_location_code: slot.locationCode,
      in_time:            session.inTime.toISOString(),
      status:             session.status,
      captured_offline:   body.captured_offline,
    });
  } catch (err) {
    next(err);
  }
});
