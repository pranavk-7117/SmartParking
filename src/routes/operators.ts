import { Router } from 'express';
import { z } from 'zod';
import { AdminRole, AdminUser, Location, OperatorReassignment } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { validatePassword, hashPassword } from '../lib/password';
import { logSecurityEvent } from '../lib/audit';

export const operatorsRouter = Router();

// Strictly require Admin access for all operator management endpoints
operatorsRouter.use(requireAuth, requireAdmin);

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
  const now = Date.now();
  const updateTime = op.lastLocationUpdate ? op.lastLocationUpdate.getTime() : 0;
  const isOnline = Boolean(
    op.lastLatitude !== null &&
    op.lastLongitude !== null &&
    updateTime > 0 &&
    (now - updateTime) <= 5 * 60 * 1000
  );

  return {
    id: op.id,
    name: op.name ?? op.username,
    username: op.username,
    contact: op.contact ?? '+91 98000 00000',
    email: op.email ?? '',
    employeeId: op.employeeId ?? '',
    shiftTime: op.shiftTime ?? 'General Shift',
    notes: op.notes ?? '',
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
    lastLatitude: op.lastLatitude,
    lastLongitude: op.lastLongitude,
    lastLocationUpdate: op.lastLocationUpdate ? op.lastLocationUpdate.toISOString() : null,
    isOnline,
    connectionStatus: isOnline ? 'ONLINE' : 'OFFLINE',
    geofenceStatus: op.geofenceStatus ?? 'INSIDE',
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
 * Returns all operator accounts with their reassignment history (Admin Only)
 */
operatorsRouter.get('/', async (req, res, next) => {
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
 * Single operator profile (Admin Only)
 */
operatorsRouter.get('/:id', async (req, res, next) => {
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
 * Creates a new operator with password policy enforcement and mandatory password change on first login.
 */
operatorsRouter.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      username: z.string().min(3),
      contact: z.string().min(8),
      assignedSiteId: z.string().min(1),
      password: z.string().optional().default('Operator@12345'),
      email: z.string().optional(),
      employeeId: z.string().optional(),
      shiftTime: z.string().optional(),
      notes: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.assignedSiteId);
    const location = await prisma.location.findFirst({
      where: isUuid ? { id: body.assignedSiteId } : { code: body.assignedSiteId },
    });
    if (!location) throw new AppError('Assigned site not found', 404);

    // Check duplicate username
    const existing = await prisma.adminUser.findFirst({
      where: { username: body.username.trim().toLowerCase() },
    });
    if (existing) {
      throw new AppError(`Username "${body.username}" is already in use. Please select a unique username.`, 409);
    }

    // Enforce password policy
    const validation = validatePassword(body.password, 'OPERATOR');
    if (!validation.valid) {
      throw new AppError(validation.error || 'Password does not meet complexity requirements', 400);
    }

    const passwordHash = await hashPassword(body.password);

    const op = await prisma.adminUser.create({
      data: {
        username: body.username.trim().toLowerCase(),
        name: body.name.trim(),
        contact: body.contact.trim(),
        email: body.email?.trim() || null,
        employeeId: body.employeeId?.trim() || null,
        shiftTime: body.shiftTime?.trim() || null,
        notes: body.notes?.trim() || null,
        passwordHash,
        role: AdminRole.OPERATOR,
        status: 'Active',
        authMethod: 'Password',
        locationId: location.id,
        lastLatitude: location.latitude,
        lastLongitude: location.longitude,
        lastLocationUpdate: new Date(),
        geofenceStatus: 'INSIDE',
        mustChangePassword: true, // Mandatory password change on first login
        tokenVersion: 1,
      },
      include: {
        location: true,
        reassignments: {
          include: { fromLocation: true, toLocation: true },
          orderBy: { reassignedAt: 'desc' },
        },
      },
    });

    await logSecurityEvent({
      eventType: 'OPERATOR_CREATED',
      severity: 'INFO',
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      targetType: 'AdminUser',
      targetId: op.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      locationId: op.locationId,
      resource: '/api/v1/operators',
      action: 'CREATE_OPERATOR',
      status: 'SUCCESS',
      details: { username: op.username, locationId: op.locationId },
    });

    res.status(201).json(formatOperator(op as OperatorWithRelations));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/operators/:id
 * Admin updates operator profile or resets password
 */
operatorsRouter.put('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const op = await findOperator(id);
    if (!op) throw new AppError('Operator not found', 404);

    const schema = z.object({
      name: z.string().min(1).optional(),
      contact: z.string().optional(),
      email: z.string().optional(),
      employeeId: z.string().optional(),
      shiftTime: z.string().optional(),
      notes: z.string().optional(),
      password: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.contact !== undefined) updateData.contact = body.contact.trim();
    if (body.email !== undefined) updateData.email = body.email.trim();
    if (body.employeeId !== undefined) updateData.employeeId = body.employeeId.trim();
    if (body.shiftTime !== undefined) updateData.shiftTime = body.shiftTime.trim();
    if (body.notes !== undefined) updateData.notes = body.notes.trim();

    if (body.password) {
      const validation = validatePassword(body.password, 'OPERATOR');
      if (!validation.valid) {
        throw new AppError(validation.error || 'Password does not meet complexity requirements', 400);
      }
      updateData.passwordHash = await hashPassword(body.password);
      updateData.tokenVersion = { increment: 1 }; // Revoke existing tokens on password reset
      updateData.mustChangePassword = true;
    }

    const updated = await prisma.adminUser.update({
      where: { id: op.id },
      data: updateData,
      include: {
        location: true,
        reassignments: {
          include: { fromLocation: true, toLocation: true },
          orderBy: { reassignedAt: 'desc' },
        },
      },
    });

    await logSecurityEvent({
      eventType: 'OPERATOR_UPDATED',
      severity: 'INFO',
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      targetType: 'AdminUser',
      targetId: op.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      locationId: op.locationId,
      resource: `/api/v1/operators/${id}`,
      action: 'UPDATE_OPERATOR',
      status: 'SUCCESS',
      details: { username: op.username, passwordReset: !!body.password },
    });

    res.json(formatOperator(updated as OperatorWithRelations));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operators/:id/reassign
 * Reassigns an operator to another site with audit logging and immediate token revocation.
 */
operatorsRouter.post('/:id/reassign', async (req, res, next) => {
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

    const adminName = req.user?.username ?? 'Admin';

    await prisma.$transaction(async (tx) => {
      // Reassign and bump tokenVersion to invalidate stale tokens with old site scope
      // Also reposition operator coordinates to the new assigned site so their geofence boundary updates immediately
      const newLat = typeof targetLocation.latitude === 'number' ? targetLocation.latitude : undefined;
      const newLng = typeof targetLocation.longitude === 'number' ? targetLocation.longitude : undefined;

      await tx.adminUser.update({
        where: { id: op.id },
        data: {
          locationId: targetLocation.id,
          tokenVersion: { increment: 1 },
          ...(newLat !== undefined && newLng !== undefined
            ? {
                lastLatitude: newLat,
                lastLongitude: newLng,
                lastLocationUpdate: new Date(),
                geofenceStatus: 'INSIDE',
              }
            : {}),
        },
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

    await logSecurityEvent({
      eventType: 'OPERATOR_REASSIGNED',
      severity: 'HIGH',
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      targetType: 'AdminUser',
      targetId: op.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      locationId: targetLocation.id,
      resource: `/api/v1/operators/${id}/reassign`,
      action: 'REASSIGN_OPERATOR',
      status: 'SUCCESS',
      details: {
        fromLocationId: op.locationId,
        toLocationId: targetLocation.id,
        reason: body.reason,
      },
    });

    res.json({
      success: true,
      operatorId: op.id,
      newSiteId: targetLocation.code,
      newSiteName: targetLocation.name,
      newLatitude: targetLocation.latitude,
      newLongitude: targetLocation.longitude,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/operators/:id/reactivate
 * Revokes termination: reinstates operator account, assigns to a site, and logs event.
 */
operatorsRouter.post('/:id/reactivate', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const schema = z.object({
      siteId: z.string().min(1),
      reason: z.string().optional(),
    });
    const body = schema.parse(req.body);

    const isUuidSite = body.siteId.length === 36 && body.siteId.includes('-');
    const targetLocation = await prisma.location.findFirst({
      where: isUuidSite ? { id: body.siteId } : { code: body.siteId },
    });
    if (!targetLocation) throw new AppError('Target site not found', 404);

    const op = await prisma.adminUser.findFirst({
      where: {
        role: AdminRole.OPERATOR,
        ...(id.length === 36 && id.includes('-') ? { id } : { username: id }),
      },
    });
    if (!op) throw new AppError('Operator not found', 404);

    const adminName = req.user?.username ?? 'Admin';

    await prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: { id: op.id },
        data: {
          status: 'Active',
          locationId: targetLocation.id,
          tokenVersion: { increment: 1 },
          lastLatitude: targetLocation.latitude,
          lastLongitude: targetLocation.longitude,
          lastLocationUpdate: new Date(),
          geofenceStatus: 'INSIDE',
        },
      });

      await tx.operatorReassignment.create({
        data: {
          operatorId: op.id,
          fromLocationId: op.locationId,
          toLocationId: targetLocation.id,
          reassignedBy: adminName,
          reason: body.reason || 'Termination Revoked: Reinstated and assigned to site',
        },
      });
    });

    await logSecurityEvent({
      eventType: 'OPERATOR_REINSTATED',
      severity: 'HIGH',
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      targetType: 'AdminUser',
      targetId: op.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      locationId: targetLocation.id,
      resource: `/api/v1/operators/${id}/reactivate`,
      action: 'REACTIVATE_OPERATOR',
      status: 'SUCCESS',
      details: {
        reason: body.reason,
        assignedSite: targetLocation.name,
      },
    });

    const refreshed = await findOperator(op.id);
    res.json({
      success: true,
      operator: refreshed ? formatOperator(refreshed) : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/operators/:id
 * Permanently deletes operator data from database upon explicit admin action.
 */
operatorsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const op = await prisma.adminUser.findFirst({
      where: {
        role: AdminRole.OPERATOR,
        ...(id.length === 36 && id.includes('-') ? { id } : { username: id }),
      },
    });
    if (!op) throw new AppError('Operator not found', 404);

    await prisma.adminUser.delete({
      where: { id: op.id },
    });

    await logSecurityEvent({
      eventType: 'OPERATOR_DELETED',
      severity: 'HIGH',
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      targetType: 'AdminUser',
      targetId: op.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      locationId: op.locationId,
      resource: `/api/v1/operators/${id}`,
      action: 'DELETE_OPERATOR',
      status: 'SUCCESS',
      details: { username: op.username, name: op.name },
    });

    res.json({ success: true, message: `Operator ${op.name || op.username} and associated records permanently deleted.` });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/operators/:id/terminate
 * Terminates an operator and immediately revokes all tokens.
 */
operatorsRouter.patch('/:id/terminate', async (req, res, next) => {
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
      data: {
        status: 'Terminated',
        tokenVersion: { increment: 1 }, // Immediate token revocation
      },
    });

    await logSecurityEvent({
      eventType: 'OPERATOR_TERMINATED',
      severity: 'HIGH',
      actorId: req.user!.id,
      actorUsername: req.user!.username,
      actorRole: req.user!.role,
      targetType: 'AdminUser',
      targetId: op.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      locationId: op.locationId,
      resource: `/api/v1/operators/${id}/terminate`,
      action: 'TERMINATE_OPERATOR',
      status: 'SUCCESS',
      details: { username: op.username },
    });

    res.json({ success: true, id: updated.id, status: updated.status });
  } catch (err) {
    next(err);
  }
});

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * POST /api/v1/operators/:id/location
 * Admin endpoint to update or simulate an operator's live GPS coordinates.
 */
operatorsRouter.post('/:id/location', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AppError('Valid latitude and longitude numbers are required', 400);
    }
    const op = await findOperator(id);
    if (!op) throw new AppError('Operator not found', 404);

    let geofenceStatus = 'INSIDE';
    let distanceToSiteMeters: number | null = null;
    const radiusMeters = 500;

    if (op.location) {
      const loc = op.location;
      const siteLat = typeof loc.latitude === 'number' ? loc.latitude : 18.5133;
      const siteLng = typeof loc.longitude === 'number' ? loc.longitude : 73.8784;
      distanceToSiteMeters = Math.round(calculateDistanceMeters(latitude, longitude, siteLat, siteLng));

      if (distanceToSiteMeters > radiusMeters) {
        geofenceStatus = 'BREACHED';
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingAlert = await prisma.notification.findFirst({
          where: {
            title: `Geofence Alert: ${op.name || op.username}`,
            createdAt: { gte: fiveMinutesAgo },
          },
        });
        if (!existingAlert) {
          await prisma.notification.create({
            data: {
              title: `Geofence Alert: ${op.name || op.username}`,
              message: `Operator ${op.name || op.username} moved ${distanceToSiteMeters}m away from assigned site "${loc.name}".`,
              priority: 'WARNING',
              sender: 'Geofence Guard',
              locationId: op.locationId,
            },
          });
        }
      }
    }

    const updated = await prisma.adminUser.update({
      where: { id: op.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: new Date(),
        geofenceStatus,
      },
      include: {
        location: true,
        reassignments: {
          include: { fromLocation: true, toLocation: true },
          orderBy: { reassignedAt: 'desc' },
        },
      },
    });

    res.json({
      success: true,
      operator: formatOperator(updated as OperatorWithRelations),
      distanceToSiteMeters,
      geofenceStatus,
    });
  } catch (err) {
    next(err);
  }
});
