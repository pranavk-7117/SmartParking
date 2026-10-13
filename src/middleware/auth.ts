import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { logSecurityEvent } from '../lib/audit';

export interface UserPayload {
  id: string;
  username: string;
  role: string;
  tokenVersion: number;
  locationId: string | null;
  mustChangePassword?: boolean;
  status?: string;
  typ: 'access';
}

// Keep OperatorPayload as alias for backwards compatibility
export type OperatorPayload = UserPayload;

// Extend the Express Request type to carry both req.user and req.operator
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      operator?: UserPayload;
    }
  }
}

/**
 * Shared JWT signing helper for access tokens.
 * Emits typ: 'access' and includes current database tokenVersion.
 * Token lifetimes: 2h for Admin, 12h for Operator (defaulting if not overridden).
 */
export function signAccessToken(
  user: {
    id: string;
    username: string;
    role: string;
    tokenVersion: number;
    locationId?: string | null;
    mustChangePassword?: boolean;
  },
  expiresIn?: string | number
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Server misconfiguration: JWT_SECRET not set');
  }

  const defaultExpiry = user.role.toUpperCase() === 'ADMIN' ? '2h' : '12h';
  const finalExpiry = expiresIn ?? process.env.JWT_EXPIRES_IN ?? defaultExpiry;

  const payload: UserPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.tokenVersion,
    locationId: user.locationId ?? null,
    mustChangePassword: user.mustChangePassword ?? false,
    typ: 'access',
  };

  return jwt.sign(payload, secret, { expiresIn: finalExpiry } as jwt.SignOptions);
}

/**
 * Authentication middleware (Option B: Token + DB status & tokenVersion check on every request).
 * Strictly requires typ: 'access'. Rejects mfa_pending or any invalid typ with 401.
 * Enforces forced password change on first login.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] as string | undefined;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      severity: 'WARN',
      ipAddress,
      userAgent,
      resource: req.originalUrl || req.path,
      action: 'REQUIRE_AUTH',
      status: 'BLOCKED',
      details: { reason: 'Missing or malformed Authorization header' },
    });
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as any;

    // Reject anything that is not an access token (e.g. mfa_pending tokens)
    if (!decoded || decoded.typ !== 'access') {
      logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        severity: 'WARN',
        actorId: decoded?.id,
        actorUsername: decoded?.username,
        ipAddress,
        userAgent,
        resource: req.originalUrl || req.path,
        action: 'REQUIRE_AUTH',
        status: 'BLOCKED',
        details: { reason: 'Invalid token typ claim', providedTyp: decoded?.typ },
      });
      res.status(401).json({ error: 'Unauthorized: Invalid token type' });
      return;
    }

    // Server-side database validation on every request (Option B)
    const dbUser = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        locationId: true,
        tokenVersion: true,
        mustChangePassword: true,
      },
    });

    if (!dbUser || dbUser.status !== 'Active') {
      logSecurityEvent({
        eventType: 'ACCOUNT_INACTIVE',
        severity: 'HIGH',
        actorId: decoded.id,
        actorUsername: decoded.username,
        ipAddress,
        userAgent,
        resource: req.originalUrl || req.path,
        action: 'REQUIRE_AUTH',
        status: 'BLOCKED',
        details: { reason: 'User account is inactive, terminated, or deleted', status: dbUser?.status },
      });
      res.status(401).json({ error: 'Unauthorized: User account is inactive or not found' });
      return;
    }

    if (dbUser.tokenVersion !== decoded.tokenVersion) {
      logSecurityEvent({
        eventType: 'TOKEN_REVOKED',
        severity: 'HIGH',
        actorId: dbUser.id,
        actorUsername: dbUser.username,
        actorRole: dbUser.role,
        ipAddress,
        userAgent,
        resource: req.originalUrl || req.path,
        action: 'REQUIRE_AUTH',
        status: 'BLOCKED',
        details: { tokenVersionInJwt: decoded.tokenVersion, tokenVersionInDb: dbUser.tokenVersion },
      });
      res.status(401).json({ error: 'Unauthorized: Token has been revoked' });
      return;
    }

    // Enforce server-side mandatory password change
    if (dbUser.mustChangePassword) {
      const path = req.path;
      const isAllowedEndpoint =
        path === '/change-password' ||
        path.endsWith('/change-password') ||
        path === '/logout' ||
        path.endsWith('/logout') ||
        path === '/me' ||
        path.endsWith('/me');

      if (!isAllowedEndpoint) {
        logSecurityEvent({
          eventType: 'PASSWORD_CHANGE_ENFORCED',
          severity: 'INFO',
          actorId: dbUser.id,
          actorUsername: dbUser.username,
          actorRole: dbUser.role,
          ipAddress,
          userAgent,
          locationId: dbUser.locationId,
          resource: req.originalUrl || req.path,
          action: 'PASSWORD_POLICY',
          status: 'BLOCKED',
          details: { reason: 'Password change required before accessing the system' },
        });
        res.status(403).json({
          error: 'Password change required before accessing the system',
          code: 'PASSWORD_CHANGE_REQUIRED',
        });
        return;
      }
    }

    // Fresh claims populated from database row, NOT stale token claims
    const authUser: UserPayload = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      tokenVersion: dbUser.tokenVersion,
      locationId: dbUser.locationId,
      mustChangePassword: dbUser.mustChangePassword,
      status: dbUser.status,
      typ: 'access',
    };

    req.user = authUser;
    req.operator = authUser;
    next();
  } catch (err: any) {
    logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      severity: 'WARN',
      ipAddress,
      userAgent,
      resource: req.originalUrl || req.path,
      action: 'REQUIRE_AUTH',
      status: 'BLOCKED',
      details: { error: err.message },
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authorization middleware: requires Admin role.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user || req.operator;
  if (!user || user.role.toUpperCase() !== 'ADMIN') {
    logSecurityEvent({
      eventType: 'ACCESS_DENIED',
      severity: 'HIGH',
      actorId: user?.id,
      actorUsername: user?.username,
      actorRole: user?.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] as string | undefined,
      locationId: user?.locationId,
      resource: req.originalUrl || req.path,
      action: 'REQUIRE_ADMIN',
      status: 'BLOCKED',
      details: { requiredRole: 'ADMIN', actualRole: user?.role ?? 'UNAUTHENTICATED' },
    });
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
}

/**
 * Authorization middleware: enforces site scoping based on a route parameter/query/body.
 * Admin has global access; Operator is strictly limited to their assigned locationId.
 * When operator omits location parameter on queries, forces scope to their assigned site.
 */
export function enforceSiteScope(paramName: string = 'locationId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user || req.operator;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.role.toUpperCase() === 'ADMIN') {
      next();
      return;
    }

    // Operator MUST have an assigned locationId
    if (!user.locationId) {
      logSecurityEvent({
        eventType: 'CROSS_SITE_ATTEMPT',
        severity: 'HIGH',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] as string | undefined,
        resource: req.originalUrl || req.path,
        action: 'ENFORCE_SITE_SCOPE',
        status: 'BLOCKED',
        details: { reason: 'Operator account has no assigned locationId' },
      });
      res.status(403).json({ error: 'Forbidden: Operator has no assigned parking site' });
      return;
    }

    const targetSiteId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (!targetSiteId) {
      // Force scope to operator's site if omitted
      if (req.params) req.params[paramName] = user.locationId;
      if (req.query) (req.query as any)[paramName] = user.locationId;
      next();
      return;
    }

    if (user.locationId !== targetSiteId) {
      logSecurityEvent({
        eventType: 'CROSS_SITE_ATTEMPT',
        severity: 'HIGH',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'] as string | undefined,
        locationId: user.locationId,
        resource: req.originalUrl || req.path,
        action: 'ENFORCE_SITE_SCOPE',
        status: 'BLOCKED',
        details: { operatorLocationId: user.locationId, attemptedLocationId: targetSiteId },
      });
      res.status(403).json({ error: 'Forbidden: Access denied for this parking site' });
      return;
    }

    next();
  };
}

/**
 * Helper function for record-derived site checks (e.g. /sessions/:id, /slots/:id).
 * Required by Part B for record-level authorization.
 * Returns true if caller is Admin or if operator's locationId matches the record's locationId.
 * Never grants access if either locationId or user.locationId is null/undefined.
 */
export function assertSiteAccess(req: Request, locationId: string | null | undefined): boolean {
  const user = req.user || req.operator;
  if (!user) return false;
  if (user.role.toUpperCase() === 'ADMIN') return true;

  // Never match null === null or undefined
  if (!locationId || !user.locationId) {
    logSecurityEvent({
      eventType: 'CROSS_SITE_ATTEMPT',
      severity: 'HIGH',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] as string | undefined,
      locationId: user.locationId ?? undefined,
      resource: req.originalUrl || req.path,
      action: 'ASSERT_SITE_ACCESS',
      status: 'BLOCKED',
      details: { reason: 'Record or operator has null/unassigned locationId', targetLocationId: locationId },
    });
    return false;
  }

  const allowed = user.locationId === locationId;
  if (!allowed) {
    logSecurityEvent({
      eventType: 'CROSS_SITE_ATTEMPT',
      severity: 'HIGH',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] as string | undefined,
      locationId: user.locationId,
      resource: req.originalUrl || req.path,
      action: 'ASSERT_SITE_ACCESS',
      status: 'BLOCKED',
      details: { operatorLocationId: user.locationId, recordLocationId: locationId },
    });
  }

  return allowed;
}
