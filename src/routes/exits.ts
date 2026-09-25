import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, SlotStatus, SessionStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
export const exitsRouter = Router();

const exitSchema = z.object({
  idempotency_key:  z.string().uuid('idempotency_key must be a valid UUID'),
  session_id:       z.string().uuid('session_id must be a valid UUID'),
  vehicle_number:   z.string().min(4).max(15),
  device_timestamp: z.string().datetime({ offset: true }),
  captured_offline: z.boolean(),
});

/**
 * POST /api/v1/exits
 * Closes an active parking session, computes billing, and returns the receipt.
 *
 * Idempotency: if a Bill already exists for this session, return 200 + original bill.
 *
 * On first call inside a transaction:
 *  1. Verify session is ACTIVE
 *  2. Mark session COMPLETED with out_time = device_timestamp
 *  3. Mark slot VACANT
 *  4. Snapshot current rate from rate_master
 *  5. Compute duration (ceiling-hour billing) + amount
 *  6. Create Bill
 *
 * Returns 200.
 */
exitsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = exitSchema.parse(req.body);
    const operatorId = req.operator!.id;

    // ── Idempotency Check ───────────────────────────────────────────────────
    const existingBill = await prisma.bill.findUnique({
      where:   { sessionId: body.session_id },
      include: { session: { include: { vehicle: true } } },
    });

    if (existingBill) {
      const s = existingBill.session;
      return res.status(200).json({
        bill_id:          existingBill.id,
        session_id:       s.id,
        vehicle_number:   s.vehicle.vehicleNumber,
        in_time:          s.inTime.toISOString(),
        out_time:         s.outTime!.toISOString(),
        duration_minutes: existingBill.durationMinutes,
        rate_applied:     parseFloat(existingBill.rateApplied.toString()),
        amount:           parseFloat(existingBill.amount.toString()),
        generated_on:     existingBill.generatedOn.toISOString(),
        operator_id:      operatorId,
      });
    }

    // ── Load Session ────────────────────────────────────────────────────────
    const session = await prisma.parkingSession.findUnique({
      where:   { id: body.session_id },
      include: { vehicle: true, slot: true },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== SessionStatus.ACTIVE) {
      throw new AppError('Session is already completed', 409);
    }

    const outTime = new Date(body.device_timestamp);
    if (outTime <= session.inTime) {
      throw new AppError('out_time must be after in_time', 400);
    }

    // ── Billing Calculation ─────────────────────────────────────────────────
    const durationMs      = outTime.getTime() - session.inTime.getTime();
    const durationMinutes = Math.max(Math.floor(durationMs / 60_000), 1);
    const durationHours   = Math.ceil(durationMinutes / 60);          // ceiling-hour

    const rateRow = await prisma.rateMaster.findFirst({
      where: {
        locationId: session.slot.locationId,
        vehicleType: session.vehicle.vehicleType,
      },
    });
    const ratePerHour = rateRow ? parseFloat(rateRow.ratePerHour.toString()) : 0;
    const amount      = durationHours * ratePerHour;

    // ── Atomic Transaction ──────────────────────────────────────────────────
    const bill = await prisma.$transaction(async (tx) => {
      // 1. Close session
      await tx.parkingSession.update({
        where: { id: body.session_id },
        data:  { status: SessionStatus.COMPLETED, outTime },
      });

      // 2. Free the slot
      await tx.slot.update({
        where: { id: session.slotId },
        data:  { status: SlotStatus.VACANT },
      });

      // 3. Create bill with snapshotted rate
      return tx.bill.create({
        data: {
          sessionId:       body.session_id,
          durationMinutes,
          rateApplied:     ratePerHour,
          amount,
        },
      });
    });

    return res.status(200).json({
      bill_id:          bill.id,
      session_id:       body.session_id,
      vehicle_number:   session.vehicle.vehicleNumber,
      in_time:          session.inTime.toISOString(),
      out_time:         outTime.toISOString(),
      duration_minutes: durationMinutes,
      rate_applied:     ratePerHour,
      amount,
      generated_on:     bill.generatedOn.toISOString(),
      operator_id:      operatorId,
    });
  } catch (err) {
    next(err);
  }
});
