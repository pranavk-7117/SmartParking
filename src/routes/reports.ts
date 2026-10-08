import { Router } from 'express';
import { VehicleType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

export const reportsRouter = Router();

async function resolveLocationId(siteIdentifier?: string): Promise<string | undefined> {
  if (!siteIdentifier || siteIdentifier === 'all') return undefined;
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
 * Compute the date window based on `range` or custom `startDate`/`endDate`.
 * Returns { from, to } with proper day boundaries.
 */
async function getDateWindow(
  range: string,
  startDateStr?: string,
  endDateStr?: string,
  siteFilter?: any
): Promise<{ from: Date; to: Date; isToday: boolean }> {
  const to = new Date();
  const from = new Date();

  // If explicit custom date range provided
  if (startDateStr && endDateStr) {
    const customFrom = new Date(startDateStr);
    const customTo = new Date(endDateStr);
    if (!isNaN(customFrom.getTime()) && !isNaN(customTo.getTime())) {
      customFrom.setHours(0, 0, 0, 0);
      customTo.setHours(23, 59, 59, 999);
      return { from: customFrom, to: customTo, isToday: false };
    }
  }

  if (range === 'Today') {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to, isToday: true };
  }

  if (range === 'This Month') {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    return { from, to, isToday: false };
  }

  if (range === 'Last 30 Days') {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from, to, isToday: false };
  }

  if (range === 'All Time') {
    // Find earliest bill or session in DB
    const earliestBill = await prisma.bill.findFirst({
      where: { session: siteFilter },
      orderBy: { generatedOn: 'asc' },
    });
    const earliestSession = await prisma.parkingSession.findFirst({
      where: siteFilter,
      orderBy: { inTime: 'asc' },
    });

    const billTime = earliestBill?.generatedOn?.getTime();
    const sessionTime = earliestSession?.inTime?.getTime();
    const minTime = Math.min(
      billTime ? billTime : Infinity,
      sessionTime ? sessionTime : Infinity
    );

    if (minTime !== Infinity) {
      from.setTime(minTime);
      from.setHours(0, 0, 0, 0);
    } else {
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
    }
    return { from, to, isToday: false };
  }

  // Default: 'This Week' (last 7 days ending today)
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return { from, to, isToday: false };
}

/**
 * GET /api/v1/reports
 * Returns dynamic live data for Revenue, Occupancy, Duration, and Transactions.
 * Supports All Time, Last 30 Days, This Week, This Month, Today, and Custom date ranges.
 */
reportsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const siteQuery = req.query.siteId as string | undefined;
    const range = (req.query.range as string | undefined) ?? 'All Time';
    const startDateStr = req.query.startDate as string | undefined;
    const endDateStr = req.query.endDate as string | undefined;
    const type = ((req.query.type as string | undefined) ?? 'Revenue') as
      | 'Revenue'
      | 'Occupancy'
      | 'Duration'
      | 'Transactions';

    const locationId = await resolveLocationId(siteQuery);
    const siteFilter = locationId ? { slot: { locationId } } : {};

    const { from, to, isToday } = await getDateWindow(
      range,
      startDateStr,
      endDateStr,
      siteFilter
    );

    // ── Fetch bills in window ────────────────────────────────────────────────
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

    // ── Fetch sessions for occupancy in window ───────────────────────────────
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

    const summary = {
      totalRevenue,
      peakOccupancyPct,
      avgDurationMinutes,
      totalTransactions,
    };

    // ── Build labels: hourly for Today, daily otherwise ──────────────────────
    let labels: { label: string; dateKey: string }[] = [];

    if (isToday) {
      // 2-hour breakdown throughout the day: 06:00 to 22:00
      const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
      labels = hours.map((h) => {
        const str = `${String(h).padStart(2, '0')}:00`;
        return { label: str, dateKey: String(h) };
      });
    } else {
      const dayMs = 24 * 60 * 60 * 1000;
      const diffDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);
      for (let i = diffDays - 1; i >= 0; i--) {
        const d = new Date(to.getTime() - i * dayMs);
        const dayLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        // Key format YYYY-MM-DD for accurate mapping
        const dateKey = d.toISOString().slice(0, 10);
        labels.push({ label: dayLabel, dateKey });
      }
    }

    // ── Revenue ──────────────────────────────────────────────────────────────
    if (type === 'Revenue') {
      const carRevMap = new Map<string, number>();
      const scooterRevMap = new Map<string, number>();
      for (const item of labels) {
        carRevMap.set(item.dateKey, 0);
        scooterRevMap.set(item.dateKey, 0);
      }

      for (const b of bills) {
        const key = isToday
          ? String(Math.floor(b.generatedOn.getHours() / 2) * 2)
          : b.generatedOn.toISOString().slice(0, 10);

        const amount = parseFloat(b.amount.toString());
        const isScooter = b.session.vehicle.vehicleType === VehicleType.SCOOTER;

        if (isScooter) {
          scooterRevMap.set(key, (scooterRevMap.get(key) ?? 0) + amount);
        } else {
          carRevMap.set(key, (carRevMap.get(key) ?? 0) + amount);
        }
      }

      const dataPoints = labels.map((item) => ({
        label: item.label,
        value: Math.round(carRevMap.get(item.dateKey) ?? 0),
        secondaryValue: Math.round(scooterRevMap.get(item.dateKey) ?? 0),
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
    for (const item of labels) {
      carTxMap.set(item.dateKey, 0);
      scooterTxMap.set(item.dateKey, 0);
    }

    for (const b of bills) {
      const key = isToday
        ? String(Math.floor(b.generatedOn.getHours() / 2) * 2)
        : b.generatedOn.toISOString().slice(0, 10);

      const isSc = b.session.vehicle.vehicleType === VehicleType.SCOOTER;
      if (isSc) {
        scooterTxMap.set(key, (scooterTxMap.get(key) ?? 0) + 1);
      } else {
        carTxMap.set(key, (carTxMap.get(key) ?? 0) + 1);
      }
    }

    const dataPoints = labels.map((item) => ({
      label: item.label,
      value: carTxMap.get(item.dateKey) ?? 0,
      secondaryValue: scooterTxMap.get(item.dateKey) ?? 0,
    }));

    res.json({ type: 'Transactions', dataPoints, summary });
  } catch (err) {
    next(err);
  }
});
