import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, VehicleType, SlotStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
export const sitesRouter = Router();

const createSiteSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  address: z.string().optional(),
  gateInfo: z.string().optional(),
  totalCarSlots: z.number().int().min(0).default(40),
  totalScooterSlots: z.number().int().min(0).default(20),
  defaultCarRate: z.number().min(0).default(30),
  defaultScooterRate: z.number().min(0).default(15),
  status: z.enum(['Active', 'Coming Soon']).default('Active'),
});

const updateSiteSchema = createSiteSchema.partial();

/**
 * GET /api/v1/sites
 * Lists all parking sites formatted for frontend Site interface.
 */
sitesRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({
      include: {
        rates: true,
        _count: {
          select: {
            slots: true,
            operators: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = locations.map((loc) => {
      const carRate = loc.rates.find((r) => r.vehicleType === VehicleType.CAR)?.ratePerHour;
      const scooterRate = loc.rates.find((r) => r.vehicleType === VehicleType.SCOOTER)?.ratePerHour;

      return {
        id: loc.code,
        dbId: loc.id,
        name: loc.name,
        code: loc.code,
        city: loc.city,
        address: loc.address ?? `${loc.name}, ${loc.city}`,
        gateInfo: loc.gateInfo ?? 'Main Entrance Gate',
        totalCarSlots: loc.totalCarSlots ?? 40,
        totalScooterSlots: loc.totalScooterSlots ?? 20,
        defaultCarRate: carRate ? parseFloat(carRate.toString()) : loc.defaultCarRate ? parseFloat(loc.defaultCarRate.toString()) : 30,
        defaultScooterRate: scooterRate ? parseFloat(scooterRate.toString()) : loc.defaultScooterRate ? parseFloat(loc.defaultScooterRate.toString()) : 15,
        status: loc.status,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sites/:id
 * Detailed site information (matched by code or UUID)
 */
sitesRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const isUuid = id.length === 36 && id.includes('-');

    const loc = await prisma.location.findFirst({
      where: isUuid ? { id } : { code: id },
      include: {
        rates: true,
        operators: {
          select: {
            id: true,
            username: true,
            name: true,
            contact: true,
            status: true,
            sessionsProcessedCount: true,
          },
        },
        slots: true,
      },
    });

    if (!loc) {
      throw new AppError('Site not found', 404);
    }

    const carRate = loc.rates.find((r) => r.vehicleType === VehicleType.CAR)?.ratePerHour;
    const scooterRate = loc.rates.find((r) => r.vehicleType === VehicleType.SCOOTER)?.ratePerHour;

    const carSlots = loc.slots.filter((s) => s.slotType === VehicleType.CAR);
    const scooterSlots = loc.slots.filter((s) => s.slotType === VehicleType.SCOOTER);

    res.json({
      id: loc.code,
      dbId: loc.id,
      name: loc.name,
      code: loc.code,
      city: loc.city,
      address: loc.address ?? `${loc.name}, ${loc.city}`,
      gateInfo: loc.gateInfo ?? 'Main Gate ANPR Lane',
      totalCarSlots: loc.totalCarSlots ?? carSlots.length,
      totalScooterSlots: loc.totalScooterSlots ?? scooterSlots.length,
      defaultCarRate: carRate ? parseFloat(carRate.toString()) : loc.defaultCarRate ? parseFloat(loc.defaultCarRate.toString()) : 30,
      defaultScooterRate: scooterRate ? parseFloat(scooterRate.toString()) : loc.defaultScooterRate ? parseFloat(loc.defaultScooterRate.toString()) : 15,
      status: loc.status,
      operators: loc.operators,
      slotsCount: {
        total: loc.slots.length,
        car: carSlots.length,
        scooter: scooterSlots.length,
        vacant: loc.slots.filter((s) => s.status === SlotStatus.VACANT).length,
        occupied: loc.slots.filter((s) => s.status === SlotStatus.OCCUPIED).length,
        deactivated: loc.slots.filter((s) => s.status === SlotStatus.OUT_OF_SERVICE).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/sites
 * Registers a new physical parking site
 */
sitesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const raw = createSiteSchema.parse(req.body);
    // Auto-derive code from name if not supplied (e.g. "My Parking Site" → "site-my-parking-site")
    const code = raw.code ?? ('site-' + raw.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    // Default city to Pune if not supplied
    const city = raw.city ?? 'Pune';
    const data = { ...raw, code, city };

    const location = await prisma.location.create({
      data: {
        name: data.name,
        code: data.code,
        city: data.city,
        address: data.address,
        gateInfo: data.gateInfo,
        totalCarSlots: data.totalCarSlots,
        totalScooterSlots: data.totalScooterSlots,
        defaultCarRate: data.defaultCarRate,
        defaultScooterRate: data.defaultScooterRate,
        status: data.status,
        rates: {
          create: [
            {
              vehicleType: VehicleType.CAR,
              ratePerHour: data.defaultCarRate,
              effectiveFrom: new Date(),
              lastUpdatedBy: req.operator?.username ?? 'Admin',
            },
            {
              vehicleType: VehicleType.SCOOTER,
              ratePerHour: data.defaultScooterRate,
              effectiveFrom: new Date(),
              lastUpdatedBy: req.operator?.username ?? 'Admin',
            },
          ],
        },
      },
    });

    res.status(201).json({
      id: location.code,
      dbId: location.id,
      name: location.name,
      code: location.code,
      city: location.city,
      address: location.address,
      gateInfo: location.gateInfo,
      totalCarSlots: location.totalCarSlots,
      totalScooterSlots: location.totalScooterSlots,
      defaultCarRate: data.defaultCarRate,
      defaultScooterRate: data.defaultScooterRate,
      status: location.status,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/sites/:id
 * Updates an existing site
 */
sitesRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const isUuid = id.length === 36 && id.includes('-');
    const data = updateSiteSchema.parse(req.body);

    const existing = await prisma.location.findFirst({
      where: isUuid ? { id } : { code: id },
    });

    if (!existing) {
      throw new AppError('Site not found', 404);
    }

    const updated = await prisma.location.update({
      where: { id: existing.id },
      data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
