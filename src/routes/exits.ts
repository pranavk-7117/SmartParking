import { Router } from 'express';
import { z } from 'zod';
import { SlotStatus, SessionStatus, VehicleType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { validateTimestampBounds } from '../lib/validation';

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
 * Operator-only: scoped to their assigned site.
 *
 * Security hardening:
 *  - Enforces that the session being closed belongs to the operator's assigned site
 *  - Validates device_timestamp bounds (≤5 min future, ≤24 h past)
 *  - Fails with 422 if no rate is configured (no silent hardcoded fallbacks)
 *
 * Idempotency: if a Bill already exists for this session, return 200 + original bill.
 *
 * On first call inside a transaction:
 *  1. Verify session is ACTIVE
 *  2. Mark session COMPLETED with out_time = device_timestamp
 *  3. Mark slot VACANT
 *  4. Snapshot current rate from rate_master (or location default — never hardcoded)
 *  5. Compute duration (ceiling-hour billing) + amount
 *  6. Create Bill
 *
 * Returns enriched receipt payload matching Android ReceiptScreen and frontend ReceiptModal.
 */
exitsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body       = exitSchema.parse(req.body);
    const operatorId = req.operator!.id;

    // ── Timestamp Bounds Check ─────────────────────────────────────────────
    const outTime = new Date(body.device_timestamp);
    validateTimestampBounds(outTime);

    // ── Idempotency Check ───────────────────────────────────────────────────
    const existingBill = await prisma.bill.findUnique({
      where:   { sessionId: body.session_id },
      include: { session: { include: { vehicle: true, slot: { include: { location: true } } } } },
    });

    if (existingBill) {
      const s = existingBill.session;

      // Site-scope check on idempotent replay too
      if (req.operator!.role !== 'admin') {
        const operatorLocationId = req.operator!.locationId;
        if (s.slot.locationId !== operatorLocationId) {
          throw new AppError('This session does not belong to your assigned location', 403);
        }
      }

      const vehicleCategory  = s.vehicle.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
      const ticketId         = `PK-${s.id.slice(0, 8).toUpperCase()}`;
      const siteName         = s.slot.location?.name ?? 'ParkIT Facility';
      const siteAddress      = s.slot.location?.address ?? 'Pune, Maharashtra';
      const slotCode         = s.slot.locationCode;
      const rateApplied      = parseFloat(existingBill.rateApplied.toString());
      const amountPaid       = parseFloat(existingBill.amount.toString());
      const durationMins     = existingBill.durationMinutes;
      const durHours         = Math.floor(durationMins / 60);
      const durMinsPart      = durationMins % 60;
      const durationText     = durHours > 0 ? `${durHours}h ${durMinsPart}m` : `${durMinsPart}m`;

      return res.status(200).json({
        bill_id:           existingBill.id,
        session_id:        s.id,
        ticket_id:         ticketId,
        vehicle_number:    s.vehicle.vehicleNumber,
        vehicle_type:      vehicleCategory,
        category:          vehicleCategory,
        slot_code:         slotCode,
        slot_id:           slotCode,
        site_name:         siteName,
        site_address:      siteAddress,
        in_time:           s.inTime.toISOString(),
        out_time:          s.outTime ? s.outTime.toISOString() : outTime.toISOString(),
        duration_minutes:  durationMins,
        duration_text:     durationText,
        rate_applied:      rateApplied,
        amount:            amountPaid,
        payment_status:    'PAID',
        payment_method:    'Cash / UPI Paid at Exit',
        generated_on:      existingBill.generatedOn.toISOString(),
        operator_id:       operatorId,
      });
    }

    // ── Load Session ────────────────────────────────────────────────────────
    const session = await prisma.parkingSession.findUnique({
      where:   { id: body.session_id },
      include: { vehicle: true, slot: { include: { location: true } } },
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== SessionStatus.ACTIVE) {
      throw new AppError('Session is already completed', 409);
    }

    // ── Site-Scope Enforcement ──────────────────────────────────────────────
    if (req.operator!.role !== 'admin') {
      const operatorLocationId = req.operator!.locationId;
      if (!operatorLocationId) {
        throw new AppError('Operator has no assigned location', 403);
      }
      if (session.slot.locationId !== operatorLocationId) {
        throw new AppError('This session does not belong to your assigned location', 403);
      }
    }

    if (outTime <= session.inTime) {
      throw new AppError('out_time must be after in_time', 400);
    }

    // ── Billing Calculation ─────────────────────────────────────────────────
    const durationMs      = outTime.getTime() - session.inTime.getTime();
    const durationMinutes = Math.max(Math.floor(durationMs / 60_000), 1);
    const durationHours   = Math.ceil(durationMinutes / 60); // ceiling-hour billing

    // 1. Try rate_master first (site-specific configured rates)
    const rateRow = await prisma.rateMaster.findFirst({
      where: {
        locationId:  session.slot.locationId,
        vehicleType: session.vehicle.vehicleType,
      },
    });
    let ratePerHour = rateRow ? parseFloat(rateRow.ratePerHour.toString()) : 0;

    // 2. Fall back to location-level default rate (also DB-configured, not hardcoded)
    if (!ratePerHour || ratePerHour <= 0) {
      const loc = session.slot.location ??
        (session.slot.locationId
          ? await prisma.location.findUnique({ where: { id: session.slot.locationId } })
          : null);
      const isCar           = session.vehicle.vehicleType === VehicleType.CAR;
      const configuredRate  = isCar ? loc?.defaultCarRate : loc?.defaultScooterRate;
      ratePerHour           = configuredRate ? parseFloat(configuredRate.toString()) : 0;
    }

    // 3. Reject if no rate is configured anywhere — prevents silent wrong billing
    if (!ratePerHour || ratePerHour <= 0) {
      throw new AppError(
        `Parking rate is not configured for site "${session.slot.location?.name ?? session.slot.locationId}"` +
        ` and vehicle type "${session.vehicle.vehicleType}". Please configure rates in the admin site settings.`,
        422
      );
    }

    const amount = durationHours * ratePerHour;

    // ── Atomic Transaction ──────────────────────────────────────────────────
    const bill = await prisma.$transaction(async (tx) => {
      await tx.parkingSession.update({
        where: { id: body.session_id },
        data:  { status: SessionStatus.COMPLETED, outTime },
      });
      await tx.slot.update({
        where: { id: session.slotId },
        data:  { status: SlotStatus.VACANT },
      });
      if (req.user?.id) {
        await tx.adminUser.update({
          where: { id: req.user.id },
          data: { sessionsProcessedCount: { increment: 1 } },
        });
      }
      return tx.bill.create({
        data: {
          sessionId:       body.session_id,
          durationMinutes,
          rateApplied:     ratePerHour,
          amount,
        },
      });
    });

    // ── Build enriched receipt response ────────────────────────────────────
    const vehicleCategory = session.vehicle.vehicleType === VehicleType.CAR ? 'Car' : 'Scooter';
    const ticketId        = `PK-${session.id.slice(0, 8).toUpperCase()}`;
    const siteName        = session.slot.location?.name ?? 'ParkIT Facility';
    const siteAddress     = session.slot.location?.address ?? 'Pune, Maharashtra';
    const slotCode        = session.slot.locationCode;
    const durHrs          = Math.floor(durationMinutes / 60);
    const durMinsRem      = durationMinutes % 60;
    const durationText    = durHrs > 0 ? `${durHrs}h ${durMinsRem}m` : `${durMinsRem}m`;

    return res.status(200).json({
      bill_id:          bill.id,
      session_id:       body.session_id,
      ticket_id:        ticketId,
      vehicle_number:   session.vehicle.vehicleNumber,
      vehicle_type:     vehicleCategory,
      category:         vehicleCategory,
      slot_code:        slotCode,
      slot_id:          slotCode,
      site_name:        siteName,
      site_address:     siteAddress,
      in_time:          session.inTime.toISOString(),
      out_time:         outTime.toISOString(),
      duration_minutes: durationMinutes,
      duration_text:    durationText,
      rate_applied:     ratePerHour,
      amount,
      payment_status:   'PAID',
      payment_method:   'Cash / UPI Paid at Exit',
      generated_on:     bill.generatedOn.toISOString(),
      operator_id:      operatorId,
    });
  } catch (err) {
    next(err);
  }
});
