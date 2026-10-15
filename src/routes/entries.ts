import { Router } from 'express';
import { z } from 'zod';
import { VehicleType, SlotStatus, SessionStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { validateTimestampBounds } from '../lib/validation';

export const entriesRouter = Router();

const entrySchema = z.object({
  idempotency_key:  z.string().uuid('idempotency_key must be a valid UUID'),
  location_id:      z.string().uuid('location_id must be a valid UUID'),
  vehicle_number:   z
    .string()
    .min(4)
    .max(15)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  vehicle_type:     z.enum(['CAR', 'SCOOTER']),
  slot_id:          z.string().uuid().nullable().optional(),
  device_timestamp: z.string().datetime({ offset: true }),
  captured_offline: z.boolean(),
});

/**
 * POST /api/v1/entries
 * Records a vehicle entry with full idempotency guarantee.
 * Operator-only: scoped to their assigned location.
 *
 * Security hardening (Part B):
 *  - Enforces operator is assigned to requested location_id (403 on mismatch)
 *  - Validates device_timestamp bounds (≤5 min future, ≤24 h past)
 *  - Slot resolution and status update are fully atomic inside the transaction
 *    to prevent TOCTOU double-allocation race conditions
 */
entriesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = entrySchema.parse(req.body);

    // ── Site-Scope Enforcement ──────────────────────────────────────────────
    // Operators may only submit entries for their own assigned location.
    const operatorLocationId = req.operator!.locationId;
    if (req.operator!.role !== 'admin') {
      if (!operatorLocationId) {
        throw new AppError('Operator has no assigned location', 403);
      }
      if (operatorLocationId !== body.location_id) {
        throw new AppError('You are not assigned to this location', 403);
      }
    }

    // ── Timestamp Bounds Check ─────────────────────────────────────────────
    const inTime = new Date(body.device_timestamp);
    validateTimestampBounds(inTime);

    // ── Idempotency Check ───────────────────────────────────────────────────
    const existing = await prisma.parkingSession.findUnique({
      where:   { id: body.idempotency_key },
      include: { vehicle: true, slot: true },
    });

    if (existing) {
      return res.status(200).json({
        session_id:         existing.id,
        vehicle_id:         existing.vehicleId,
        vehicle_number:     existing.vehicle.vehicleNumber,
        vehicle_type:       existing.vehicle.vehicleType,
        slot_id:            existing.slotId,
        slot_location_code: existing.slot.locationCode,
        in_time:            existing.inTime.toISOString(),
        status:             existing.status,
        captured_offline:   body.captured_offline,
      });
    }

    // ── Atomic Slot Resolution + Allocation (TOCTOU fix) ──────────────────
    // Slot is resolved AND marked OCCUPIED inside a single transaction to
    // prevent two concurrent requests from allocating the same slot.
    const [session, vehicle, slot] = await prisma.$transaction(async (tx) => {
      // 1. Upsert vehicle
      const v = await tx.vehicle.upsert({
        where:  { vehicleNumber: body.vehicle_number },
        create: { vehicleNumber: body.vehicle_number, vehicleType: body.vehicle_type as VehicleType },
        update: {},
      });

      // 2. Resolve slot inside the transaction
      let resolvedSlot;
      if (body.slot_id) {
        // Operator specified a slot — find it, validate status in the same tx
        resolvedSlot = await tx.slot.findUnique({ where: { id: body.slot_id } });
        if (!resolvedSlot) throw new AppError(`Slot ${body.slot_id} not found`, 404);
        if (resolvedSlot.status !== SlotStatus.VACANT) {
          throw new AppError(`Slot ${resolvedSlot.locationCode} is not vacant`, 409);
        }
        if (resolvedSlot.slotType !== (body.vehicle_type as VehicleType)) {
          throw new AppError(`Slot type mismatch: slot is for ${resolvedSlot.slotType}`, 409);
        }
        // Verify slot belongs to the operator's location
        if (req.operator!.role !== 'admin' && resolvedSlot.locationId !== body.location_id) {
          throw new AppError('Slot does not belong to this location', 409);
        }
      } else {
        // Auto-allocate: findFirst then immediately update to OCCUPIED atomically
        resolvedSlot = await tx.slot.findFirst({
          where: {
            locationId: body.location_id,
            slotType:   body.vehicle_type as VehicleType,
            status:     SlotStatus.VACANT,
          },
          orderBy: { locationCode: 'asc' },
        });
        if (!resolvedSlot) throw new AppError(`No vacant ${body.vehicle_type} slot available`, 409);
      }

      // 3. Mark slot OCCUPIED (inside tx — atomic with session creation)
      await tx.slot.update({
        where: { id: resolvedSlot.id },
        data:  { status: SlotStatus.OCCUPIED },
      });

      // 4. Create session (id = idempotency_key for deterministic replay)
      const s = await tx.parkingSession.create({
        data: {
          id:        body.idempotency_key,
          vehicleId: v.id,
          slotId:    resolvedSlot.id,
          inTime,
          status:    SessionStatus.ACTIVE,
        },
      });

      return [s, v, resolvedSlot];
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
