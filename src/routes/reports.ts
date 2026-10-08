import { Router } from 'express';
import { VehicleType, SessionStatus } from '@prisma/client';
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
 * Returns { from, to, isToday } with exact day boundaries.
 */
async function getDateWindow(
  range: string,
  startDateStr?: string,
  endDateStr?: string,
  siteFilter?: any
): Promise<{ from: Date; to: Date; isToday: boolean }> {
  const to = new Date();
  const from = new Date();

  // Explicit custom range
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

  if (range === 'This Week') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to, isToday: false };
  }

  // Default: 'All Time'
  const earliestSession = await prisma.parkingSession.findFirst({
    where: siteFilter,
    orderBy: { inTime: 'asc' },
  });
  const earliestBill = await prisma.bill.findFirst({
    where: { session: siteFilter },
    orderBy: { generatedOn: 'asc' },
  });

  const sessionTime = earliestSession?.inTime?.getTime();
  const billTime = earliestBill?.generatedOn?.getTime();
  const minTime = Math.min(
    sessionTime ? sessionTime : Infinity,
    billTime ? billTime : Infinity
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

/**
 * Format a Date to a clean user-facing label (e.g. "09 Oct" or "Today")
 */
function formatDateLabel(d: Date, isTodayFlag?: boolean): string {
  const now = new Date();
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return 'Today (' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ')';
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/**
 * GET /api/v1/reports
 * Live reports dynamically populated by real vehicles and transactions.
 * Only displays dates that actually have activity or data — no filler zero rows.
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

    // ── Fetch all sessions in the window ─────────────────────────────────────
    const sessions = await prisma.parkingSession.findMany({
      where: {
        inTime: { gte: from, lte: to },
        ...(locationId ? { slot: { locationId } } : {}),
      },
      include: {
        vehicle: true,
        bill: true,
        slot: { include: { location: true } },
      },
      orderBy: { inTime: 'asc' },
    });

    // ── Fetch all bills in the window ────────────────────────────────────────
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

    // Total transactions = total sessions created/processed in this period
    const totalTransactions = sessions.length;

    // ── Slot capacity for Occupancy ──────────────────────────────────────────
    let totalSlots = 0;
    if (locationId) {
      totalSlots = await prisma.slot.count({ where: { locationId } });
    } else {
      totalSlots = await prisma.slot.count();
    }

    // Peak occupancy calculation
    const hourCounts = new Map<number, number>();
    for (const s of sessions) {
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

    // ── 1. TRANSACTIONS (Vehicle entries & checkouts) ─────────────────────────
    if (type === 'Transactions') {
      if (isToday) {
        // Hourly breakdown for Today
        const hours = [8, 10, 12, 14, 16, 18, 20, 22];
        const dataPoints = hours.map((hour) => {
          const carsInHour = sessions.filter(
            (s) =>
              s.vehicle.vehicleType === VehicleType.CAR &&
              s.inTime.getHours() >= hour - 2 &&
              s.inTime.getHours() < hour
          ).length;
          const scootersInHour = sessions.filter(
            (s) =>
              s.vehicle.vehicleType === VehicleType.SCOOTER &&
              s.inTime.getHours() >= hour - 2 &&
              s.inTime.getHours() < hour
          ).length;
          return {
            label: `${String(hour).padStart(2, '0')}:00`,
            value: carsInHour,
            secondaryValue: scootersInHour,
          };
        });
        return res.json({ type: 'Transactions', dataPoints, summary });
      }

      // Group sessions by day: key = YYYY-MM-DD
      const dayMap = new Map<
        string,
        { date: Date; cars: number; scooters: number }
      >();

      for (const s of sessions) {
        const key = s.inTime.toISOString().slice(0, 10);
        if (!dayMap.has(key)) {
          dayMap.set(key, { date: s.inTime, cars: 0, scooters: 0 });
        }
        const item = dayMap.get(key)!;
        if (s.vehicle.vehicleType === VehicleType.SCOOTER) {
          item.scooters++;
        } else {
          item.cars++;
        }
      }

      // If user is viewing a range that includes today and today has no sessions yet,
      // we only include days that actually had vehicles added.
      const sortedKeys = Array.from(dayMap.keys()).sort();
      const dataPoints = sortedKeys.map((key) => {
        const item = dayMap.get(key)!;
        return {
          label: formatDateLabel(item.date),
          value: item.cars,
          secondaryValue: item.scooters,
        };
      });

      return res.json({ type: 'Transactions', dataPoints, summary });
    }

    // ── 2. REVENUE ───────────────────────────────────────────────────────────
    if (type === 'Revenue') {
      if (isToday) {
        const hours = [8, 10, 12, 14, 16, 18, 20, 22];
        const dataPoints = hours.map((hour) => {
          let carRev = 0;
          let scooterRev = 0;
          for (const b of bills) {
            const h = b.generatedOn.getHours();
            if (h >= hour - 2 && h < hour) {
              const amt = parseFloat(b.amount.toString());
              if (b.session.vehicle.vehicleType === VehicleType.SCOOTER) {
                scooterRev += amt;
              } else {
                carRev += amt;
              }
            }
          }
          return {
            label: `${String(hour).padStart(2, '0')}:00`,
            value: Math.round(carRev),
            secondaryValue: Math.round(scooterRev),
          };
        });
        return res.json({ type: 'Revenue', dataPoints, summary });
      }

      // Group bills AND sessions with activity by day
      const dayMap = new Map<
        string,
        { date: Date; carRev: number; scooterRev: number }
      >();

      // Populate from bills
      for (const b of bills) {
        const key = b.generatedOn.toISOString().slice(0, 10);
        if (!dayMap.has(key)) {
          dayMap.set(key, { date: b.generatedOn, carRev: 0, scooterRev: 0 });
        }
        const item = dayMap.get(key)!;
        const amt = parseFloat(b.amount.toString());
        if (b.session.vehicle.vehicleType === VehicleType.SCOOTER) {
          item.scooterRev += amt;
        } else {
          item.carRev += amt;
        }
      }

      // Also ensure any day with active sessions entered is represented
      for (const s of sessions) {
        const key = s.inTime.toISOString().slice(0, 10);
        if (!dayMap.has(key)) {
          dayMap.set(key, { date: s.inTime, carRev: 0, scooterRev: 0 });
        }
      }

      const sortedKeys = Array.from(dayMap.keys()).sort();
      const dataPoints = sortedKeys.map((key) => {
        const item = dayMap.get(key)!;
        return {
          label: formatDateLabel(item.date),
          value: Math.round(item.carRev),
          secondaryValue: Math.round(item.scooterRev),
        };
      });

      return res.json({ type: 'Revenue', dataPoints, summary });
    }

    // ── 3. OCCUPANCY ─────────────────────────────────────────────────────────
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

    // ── 4. DURATION ──────────────────────────────────────────────────────────
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

    res.json({ type: 'Revenue', dataPoints: [], summary });
  } catch (err) {
    next(err);
  }
});
