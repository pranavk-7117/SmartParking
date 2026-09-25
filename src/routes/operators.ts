import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient, AdminRole, AdminUser, Location, OperatorReassignment } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
export const operatorsRouter = Router();

type OperatorWithRelations = AdminUser & {
  location: Location | null;
  reassignments: (OperatorReassignment & {
    fromLocation: Location | null;
    toLocation: Location;
  })[];
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

/** Finds an operator by UUID or username */
async function findOperator(idOrUsername: string): Promise<OperatorWithRelations | null> {
  const isUuid = idOrUsername.length === 36 && idOrUsername.includes('-');
  return prisma.adminUser.findFirst({
    where: {
      role: AdminRole.OPERATOR,
      ...(isUuid ? { id: idOrUsername } : { username: idOrUsername }),
    },
    include: {
      location: true,
      reassignments: {
        include: { fromLocation: true, toLocation: true },
        orderBy: { reassignedAt: 'desc' },
      },
    },
  }) as Promise<OperatorWithRelations | null>;
}

function formatOperator(op: OperatorWithRelations) {
  return {
    id: op.id,
    name: op.name ?? op.username,
    username: op.username,
    contact: op.contact ?? '+91 98000 00000',
    assignedSiteId: op.location?.code ?? '',
    assignedSiteName: op.location?.name ?? 'Unassigned',
    status: op.status,
    dateAdded: op.createdAt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    authMethod: op.authMethod,
    sessionsProcessedCount: op.sessionsProcessedCount,
    reassignmentHistory: op.reassignments.map((r) => ({
      id: r.id,
      operatorId: r.operatorId,
      fromSiteId: r.fromLocation?.code ?? '',
      fromSiteName: r.fromLocation?.name ?? 'Previous Site',
      toSiteId: r.toLocation.code,
      toSiteName: r.toLocation.name,
      reassignedBy: r.reassignedBy,
      reassignedAt: r.reassignedAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reason: r.reason ?? 'Shift transfer',
    })),
  };
}

/**
 * GET /api/v1/operators
 * Returns all operator accounts with their reassignment history
 */
operatorsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const siteQuery = req.query.siteId as string | undefined;
    const locationId = await resolveLocationId(siteQuery);

    const operators = (await prisma.adminUser.findMany({
      where: {
        role: AdminRole.OPERATOR,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        location: true,
        reassignments: {
          include: { fromLocation: true, toLocation: true },
          orderBy: { reassignedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })) as OperatorWithRelations[];

    res.json(operators.map(formatOperator));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/operators/:id
 * Single operator profile
 */
operatorsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const op = await findOperator(id);
    if (!op) throw new AppError('Operator not found', 404);
    res.json(formatOperator(op));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operators
 * Creates a new operator
 */
operatorsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      username: z.string().min(3),
      contact: z.string().min(8),
      assignedSiteId: z.string().min(1),
      password: z.string().optional().default('Operator@123'),
    });

    const body = schema.parse(req.body);
    const locationId = await resolveLocationId(body.assignedSiteId);
    if (!locationId) throw new AppError('Assigned site not found', 404);

    const passwordHash = await bcrypt.hash(body.password, 10);

    const op = await prisma.adminUser.create({
      data: {
        username: body.username.trim().toLowerCase(),
        name: body.name.trim(),
        contact: body.contact.trim(),
        passwordHash,
        role: AdminRole.OPERATOR,
        status: 'Active',
        authMethod: 'Password',
        locationId,
      },
      include: { location: true },
    });

    res.status(201).json({
      id: op.id,
      name: op.name,
      username: op.username,
      contact: op.contact,
      assignedSiteId: op.location?.code ?? body.assignedSiteId,
      assignedSiteName: op.location?.name ?? '',
      status: op.status,
      dateAdded: op.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      authMethod: op.authMethod,
      sessionsProcessedCount: 0,
      reassignmentHistory: [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operators/:id/reassign
 * Reassigns an operator to another site with audit logging
 */
operatorsRouter.post('/:id/reassign', requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const schema = z.object({
      newSiteId: z.string().min(1),
      reason: z.string().optional(),
    });

    const body = schema.parse(req.body);

    const isUuidSite = body.newSiteId.length === 36 && body.newSiteId.includes('-');
    const targetLocation = await prisma.location.findFirst({
      where: isUuidSite ? { id: body.newSiteId } : { code: body.newSiteId },
    });

    if (!targetLocation) throw new AppError('Target site not found', 404);

    const op = await prisma.adminUser.findFirst({
      where: {
        role: AdminRole.OPERATOR,
        ...(id.length === 36 && id.includes('-') ? { id } : { username: id }),
      },
    });

    if (!op) throw new AppError('Operator not found', 404);

    const adminName = req.operator?.username ?? 'Admin';

    await prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id: op.id },
        data: { locationId: targetLocation.id },
      });

      await tx.operatorReassignment.create({
        data: {
          operatorId: op.id,
          fromLocationId: op.locationId,
          toLocationId: targetLocation.id,
          reassignedBy: adminName,
          reason: body.reason ?? 'Shift transfer',
        },
      });
    });

    res.json({
      success: true,
      operatorId: op.id,
      newSiteId: targetLocation.code,
      newSiteName: targetLocation.name,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/operators/:id/terminate
 * Terminates an operator
 */
operatorsRouter.patch('/:id/terminate', requireAuth, async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const op = await prisma.adminUser.findFirst({
      where: {
        role: AdminRole.OPERATOR,
        ...(id.length === 36 && id.includes('-') ? { id } : { username: id }),
      },
    });

    if (!op) throw new AppError('Operator not found', 404);

    const updated = await prisma.adminUser.update({
      where: { id: op.id },
      data: { status: 'Terminated' },
    });

    res.json({ success: true, id: updated.id, status: updated.status });
  } catch (err) {
    next(err);
  }
});
