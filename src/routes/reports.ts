import { Router } from 'express';
import { VehicleType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

export const reportsRouter = Router();

async function resolveLocationId(siteIdentifier?: string): Promise<string | undefined> {
  if (!siteIdentifier) return undefined;
  const loc = await prisma.location.findFirst({
    where: {
      OR: [
        { id: siteIdentifier.length === 36 && siteIdentifier.includes('-') ? siteIdentifier : undefined },
        { code: siteIdentifier },
      ],
    },
  });
  return loc?.id;
}

/**
 * Compute the date window based on the `range` query parameter.
 * Returns { from, to } in UTC.
 */
function getDateWindow(range: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  if (range === 'Today') {
    from.setHours(0, 0, 0, 0);
  } else if (range === 'This Month') {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    // Default: This Week (last 7 days)
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
}

/**
 * GET /api/v1/reports
 * Returns live data for Revenue, Occupancy, Duration, and Transactions.
 * No hardcoded fallbacks — everything comes from the database.
 */
reportsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const siteQuery = req.query.siteId as string | undefined;
    const range = (req.query.range as string | undefined) ?? 'This Week';
    const type = ((req.query.type as string | undefined) ?? 'Revenue') as
      | 'Revenue'
      | 'Occupancy'
      | 'Duration'
      | 'Transactions';

    const locationId = await resolveLocationId(siteQuery);
    const { from, to } = getDateWindow(range);

    const siteFilter = locationId ? { slot: { locationId } } : {};

    // ── Shared: fetch all bills in window ───────────────────────────────────
    const bills = await prisma.bill.findMany({
      where: {
        generatedOn: { gte: from, lte: to },
        session: siteFilter,
      },
      include: {
        session: { include: { vehicle: true } },
      },
      orderBy: { generatedOn: 'asc' },
    });

    const totalRevenue = bills.reduce((acc, b) => acc + parseFloat(b.amount.toString()), 0);
    const avgDurationMinutes =
      bills.length > 0
        ? Math.round(bills.reduce((acc, b) => acc + b.durationMinutes, 0) / bills.length)
        : 0;
    const totalTransactions = bills.length;

    // Compute real peak occupancy % from sessions in this window
    const sessionsInWindow = await prisma.parkingSession.findMany({
      where: {
        inTime: { gte: from, lte: to },
        ...(locationId ? { slot: { locationId } } : {}),
      },
      include: { slot: true },
    });

    let totalSlots = 0;
    if (locationId) {
      totalSlots = await prisma.slot.count({ where: { locationId } });
    } else {
      totalSlots = await prisma.slot.count();
    }

    // Peak occupancy: group sessions by hour and find the max concurrent
    const hourCounts = new Map<number, number>();
    for (const s of sessionsInWindow) {
      const inHour = s.inTime.getHours();
      const outHour = s.outTime ? s.outTime.getHours() : new Date().getHours();
      for (let h = inHour; h <= outHour; h++) {
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
    }
    const maxConcurrent = hourCounts.size > 0 ? Math.max(...hourCounts.values()) : 0;
    const peakOccupancyPct =
      totalSlots > 0 ? Math.min(100, Math.round((maxConcurrent / totalSlots) * 100)) : 0;

    // ── Build day labels ─────────────────────────────────────────────────────
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((to.getTime() - from.getTime()) / dayMs) + 1;
    const days: string[] = [];
    for (let i = diffDays - 1; i >= 0; i--) {
      const d = new Date(to.getTime() - i * dayMs);
      days.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    }

    const summary = {
      totalRevenue,
      peakOccupancyPct,
      avgDurationMinutes,
      totalTransactions,
    };

    // ── Revenue ──────────────────────────────────────────────────────────────
    if (type === 'Revenue') {
      const carRevMap = new Map<string, number>();
      const scooterRevMap = new Map<string, number>();
      for (const d of days) { carRevMap.set(d, 0); scooterRevMap.set(d, 0); }

      for (const b of bills) {
        const dStr = b.generatedOn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const amount = parseFloat(b.amount.toString());
        const isScooter = b.session.vehicle.vehicleType === VehicleType.SCOOTER;
        if (isScooter) {
          scooterRevMap.set(dStr, (scooterRevMap.get(dStr) ?? 0) + amount);
        } else {
          carRevMap.set(dStr, (carRevMap.get(dStr) ?? 0) + amount);
        }
      }

      const dataPoints = days.map((day) => ({
        label: day,
        value: Math.round(carRevMap.get(day) ?? 0),
        secondaryValue: Math.round(scooterRevMap.get(day) ?? 0),
      }));

      return res.json({ type: 'Revenue', dataPoints, summary });
    }

    // ── Occupancy ────────────────────────────────────────────────────────────
    if (type === 'Occupancy') {
      const checkHours = [8, 10, 12, 14, 16, 18, 20];
      const dataPoints = checkHours.map((hour) => {
        const count = hourCounts.get(hour) ?? 0;
        const pct = totalSlots > 0 ? Math.min(100, Math.round((count / totalSlots) * 100)) : 0;
        return {
          label: `${String(hour).padStart(2, '0')}:00`,
          value: pct,
        };
      });

      return res.json({ type: 'Occupancy', dataPoints, summary });
    }

    // ── Duration ─────────────────────────────────────────────────────────────
    if (type === 'Duration') {
      const ranges = [
        { label: '< 1 hr', min: 0, max: 60, cars: 0, scooters: 0 },
        { label: '1–2 hrs', min: 61, max: 120, cars: 0, scooters: 0 },
        { label: '2–4 hrs', min: 121, max: 240, cars: 0, scooters: 0 },
        { label: '> 4 hrs', min: 241, max: 99999, cars: 0, scooters: 0 },
      ];

      for (const b of bills) {
        const isSc = b.session.vehicle.vehicleType === VehicleType.SCOOTER;
        for (const r of ranges) {
          if (b.durationMinutes >= r.min && b.durationMinutes <= r.max) {
            if (isSc) r.scooters++;
            else r.cars++;
            break;
          }
        }
      }

      const dataPoints = ranges.map((r) => ({
        label: r.label,
        value: r.cars,
        secondaryValue: r.scooters,
      }));

      return res.json({ type: 'Duration', dataPoints, summary });
    }

    // ── Transactions ─────────────────────────────────────────────────────────
    const carTxMap = new Map<string, number>();
    const scooterTxMap = new Map<string, number>();
    for (const d of days) { carTxMap.set(d, 0); scooterTxMap.set(d, 0); }

    for (const b of bills) {
      const dStr = b.generatedOn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const isSc = b.session.vehicle.vehicleType === VehicleType.SCOOTER;
      if (isSc) {
        scooterTxMap.set(dStr, (scooterTxMap.get(dStr) ?? 0) + 1);
      } else {
        carTxMap.set(dStr, (carTxMap.get(dStr) ?? 0) + 1);
      }
    }

    const dataPoints = days.map((day) => ({
      label: day,
      value: carTxMap.get(day) ?? 0,
      secondaryValue: scooterTxMap.get(day) ?? 0,
    }));

    res.json({ type: 'Transactions', dataPoints, summary });
  } catch (err) {
    next(err);
  }
});
