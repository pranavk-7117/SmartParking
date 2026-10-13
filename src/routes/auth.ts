import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, signAccessToken } from '../middleware/auth';
import prisma from '../lib/prisma';
import {
  validatePassword,
  hashPassword,
  comparePassword,
  verifyDummyPassword,
} from '../lib/password';
import {
  generateTotpSetup,
  decryptMfaSecret,
  verifyTotpToken,
  hashRecoveryCode,
  signMfaPendingToken,
  verifyMfaPendingToken,
} from '../lib/mfa';
import { logSecurityEvent } from '../lib/audit';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/v1/auth/login
 * Authenticates Admin or Operator.
 * Enforces X-Client-Type header, database-backed lockout, timing invariance, and MFA challenge.
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientType = req.headers['x-client-type'];
    if (!clientType || (clientType !== 'admin-web' && clientType !== 'operator-android')) {
      res.status(400).json({ error: 'Missing or invalid X-Client-Type header' });
      return;
    }

    const { username, password } = loginSchema.parse(req.body);
    const ipAddress = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();
    const userAgent = req.headers['user-agent'] as string | undefined;
    const normalizedUsername = username.trim().toLowerCase();

    // 15-minute lockout window
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);

    // Uniform Lockout Check (5 failures / 15 mins per username + IP)
    const recentFailures = await prisma.loginAttempt.findMany({
      where: {
        username: normalizedUsername,
        ipAddress,
        successful: false,
        attemptedAt: { gte: windowStart },
      },
      orderBy: { attemptedAt: 'asc' },
    });

    if (recentFailures.length >= 5) {
      const oldestFailure = recentFailures[0];
      const elapsedMs = Date.now() - oldestFailure.attemptedAt.getTime();
      const retryAfter = Math.max(1, Math.ceil((15 * 60 * 1000 - elapsedMs) / 1000));

      await logSecurityEvent({
        eventType: 'LOGIN_LOCKOUT',
        severity: 'HIGH',
        actorUsername: normalizedUsername,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'LOGIN',
        status: 'BLOCKED',
        details: { failedAttempts: recentFailures.length, retryAfter },
      });

      res.status(429).json({
        error: 'Too many failed login attempts. Account temporarily locked.',
        code: 'ACCOUNT_LOCKED',
        retryAfter,
      });
      return;
    }

    // Progressive delay for repeat failures on this username
    const usernameFailures = await prisma.loginAttempt.count({
      where: {
        username: normalizedUsername,
        successful: false,
        attemptedAt: { gte: windowStart },
      },
    });

    if (usernameFailures > 0) {
      const delayMs = Math.min(2000, usernameFailures * 200);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Query user
    const user = await prisma.adminUser.findFirst({
      where: {
        username: {
          equals: normalizedUsername,
          mode: 'insensitive',
        },
      },
      include: { location: true },
    });

    if (!user) {
      // Record failure for lockout tracking even for non-existent users
      await prisma.loginAttempt.create({
        data: {
          username: normalizedUsername,
          ipAddress,
          successful: false,
        },
      });

      // Constant-time dummy comparison to prevent timing enumeration
      await verifyDummyPassword(password);

      await logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        severity: 'WARN',
        actorUsername: normalizedUsername,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'LOGIN',
        status: 'FAILURE',
        details: { reason: 'User not found' },
      });

      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    if (user.status === 'Terminated') {
      await verifyDummyPassword(password);

      await logSecurityEvent({
        eventType: 'ACCOUNT_INACTIVE',
        severity: 'HIGH',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'LOGIN',
        status: 'BLOCKED',
        details: { reason: 'Terminated account login attempt' },
      });

      res.status(403).json({ error: 'This user account has been terminated' });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      await prisma.loginAttempt.create({
        data: {
          username: user.username.toLowerCase(),
          ipAddress,
          successful: false,
        },
      });

      await logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        severity: 'WARN',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'LOGIN',
        status: 'FAILURE',
        details: { reason: 'Invalid password' },
      });

      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Role segregation enforcement
    if (clientType === 'admin-web' && user.role.toUpperCase() !== 'ADMIN') {
      await logSecurityEvent({
        eventType: 'ROLE_SEGREGATION_VIOLATION',
        severity: 'HIGH',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'LOGIN',
        status: 'BLOCKED',
        details: { clientType, expectedRole: 'ADMIN' },
      });
      res.status(403).json({ error: 'Operator accounts must use the handheld operator app' });
      return;
    }

    if (clientType === 'operator-android' && user.role.toUpperCase() === 'ADMIN') {
      await logSecurityEvent({
        eventType: 'ROLE_SEGREGATION_VIOLATION',
        severity: 'HIGH',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'LOGIN',
        status: 'BLOCKED',
        details: { clientType, disallowedRole: 'ADMIN' },
      });
      res.status(403).json({ error: 'Administrator accounts cannot log in to the handheld operator app' });
      return;
    }

    // Record successful attempt
    await prisma.loginAttempt.create({
      data: {
        username: user.username.toLowerCase(),
        ipAddress,
        successful: true,
      },
    });

    // Check if MFA is required (Admin with mfaEnabled)
    if (user.mfaEnabled && user.role.toUpperCase() === 'ADMIN') {
      const mfaPendingToken = signMfaPendingToken(user.id, user.username);

      await logSecurityEvent({
        eventType: 'MFA_CHALLENGE_ISSUED',
        severity: 'INFO',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress,
        userAgent,
        resource: '/api/v1/auth/login',
        action: 'MFA_CHALLENGE',
        status: 'SUCCESS',
      });

      res.status(200).json({
        mfaRequired: true,
        mfaPendingToken,
        expiresInSeconds: 300,
      });
      return;
    }

    // Issue standard access token
    const tokenLifetime = user.role.toUpperCase() === 'ADMIN' ? '2h' : '12h';
    const token = signAccessToken(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion,
        locationId: user.locationId ?? null,
        mustChangePassword: user.mustChangePassword,
      },
      tokenLifetime
    );

    const userProfile = {
      id: user.id,
      username: user.username,
      name: user.name ?? user.username,
      role: user.role.toLowerCase(),
      status: user.status,
      locationId: user.locationId,
      locationName: user.location?.name ?? null,
      mustChangePassword: user.mustChangePassword,
      lastLogin: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    await logSecurityEvent({
      eventType: 'AUTH_SUCCESS',
      severity: 'INFO',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress,
      userAgent,
      locationId: user.locationId,
      resource: '/api/v1/auth/login',
      action: 'LOGIN',
      status: 'SUCCESS',
    });

    res.status(200).json({
      access_token: token,
      token,
      operator_id: user.id,
      ...userProfile,
      user: userProfile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/mfa/login
 * Validates 6-digit TOTP code or 8-character recovery code for pending admin login.
 */
authRouter.post('/mfa/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      mfaPendingToken: z.string().min(1, 'MFA pending token is required'),
      code: z.string().min(1, 'Verification code is required'),
    });

    const { mfaPendingToken, code } = schema.parse(req.body);
    const verified = verifyMfaPendingToken(mfaPendingToken);

    if (!verified) {
      res.status(401).json({ error: 'Invalid or expired MFA pending token' });
      return;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: verified.userId },
      include: { location: true },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      res.status(401).json({ error: 'Two-factor authentication is not configured for this account' });
      return;
    }

    const cleanCode = code.trim();
    let isCodeValid = false;
    let usedRecoveryCode = false;

    if (cleanCode.length === 6) {
      // 6-digit TOTP code
      const plaintextSecret = decryptMfaSecret(user.mfaSecret);
      isCodeValid = verifyTotpToken(cleanCode, plaintextSecret);
    } else {
      // Recovery code check
      const hashedInput = hashRecoveryCode(cleanCode);
      if (user.mfaRecoveryCodes && user.mfaRecoveryCodes.includes(hashedInput)) {
        isCodeValid = true;
        usedRecoveryCode = true;
        // Atomically burn the used recovery code
        const remainingCodes = user.mfaRecoveryCodes.filter((c) => c !== hashedInput);
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { mfaRecoveryCodes: remainingCodes },
        });
      }
    }

    if (!isCodeValid) {
      await logSecurityEvent({
        eventType: 'MFA_FAILURE',
        severity: 'WARN',
        actorId: user.id,
        actorUsername: user.username,
        actorRole: user.role,
        ipAddress: req.ip || req.socket.remoteAddress,
        resource: '/api/v1/auth/mfa/login',
        action: 'MFA_VERIFY',
        status: 'FAILURE',
      });
      res.status(401).json({ error: 'Invalid verification or recovery code' });
      return;
    }

    // Issue full access token
    const token = signAccessToken(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        tokenVersion: user.tokenVersion,
        locationId: user.locationId ?? null,
        mustChangePassword: user.mustChangePassword,
      },
      '2h'
    );

    const userProfile = {
      id: user.id,
      username: user.username,
      name: user.name ?? user.username,
      role: user.role.toLowerCase(),
      status: user.status,
      locationId: user.locationId,
      locationName: user.location?.name ?? null,
      mustChangePassword: user.mustChangePassword,
      lastLogin: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    await logSecurityEvent({
      eventType: 'AUTH_SUCCESS',
      severity: 'INFO',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      resource: '/api/v1/auth/mfa/login',
      action: 'MFA_LOGIN',
      status: 'SUCCESS',
      details: { usedRecoveryCode },
    });

    res.status(200).json({
      access_token: token,
      token,
      operator_id: user.id,
      ...userProfile,
      user: userProfile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 * Revokes current user tokens by bumping database tokenVersion.
 */
authRouter.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    await logSecurityEvent({
      eventType: 'LOGOUT',
      severity: 'INFO',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      resource: '/api/v1/auth/logout',
      action: 'LOGOUT',
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/mfa/setup
 * Generates TOTP secret and backup recovery codes for Admin setup.
 */
authRouter.post('/mfa/setup', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const setup = await generateTotpSetup(user.username);

    // Save encrypted secret and recovery codes temporarily (mfaEnabled remains false until verified)
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        mfaSecret: setup.encryptedSecret,
        mfaRecoveryCodes: setup.hashedRecoveryCodes,
      },
    });

    res.status(200).json({
      secret: setup.secret,
      qrCodeDataUrl: setup.qrCodeDataUrl,
      otpauthUri: setup.otpauthUri,
      recoveryCodes: setup.plainRecoveryCodes,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/mfa/verify
 * Confirms TOTP setup by verifying first 6-digit code and activates MFA.
 */
authRouter.post('/mfa/verify', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      code: z.string().min(6).max(6),
    });
    const { code } = schema.parse(req.body);
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.mfaSecret) {
      res.status(400).json({ error: 'MFA setup has not been initiated' });
      return;
    }

    const plaintextSecret = decryptMfaSecret(user.mfaSecret);
    const valid = verifyTotpToken(code, plaintextSecret);

    if (!valid) {
      res.status(400).json({ error: 'Invalid verification code. Please check your authenticator app.' });
      return;
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    await logSecurityEvent({
      eventType: 'MFA_ENABLED',
      severity: 'HIGH',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      resource: '/api/v1/auth/mfa/verify',
      action: 'MFA_ENABLE',
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Two-factor authentication enabled successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/mfa/disable
 * Disables TOTP MFA with mandatory password confirmation.
 */
authRouter.post('/mfa/disable', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schema = z.object({
      password: z.string().min(1, 'Password is required to disable MFA'),
    });
    const { password } = schema.parse(req.body);
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [],
      },
    });

    await logSecurityEvent({
      eventType: 'MFA_DISABLED',
      severity: 'HIGH',
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      resource: '/api/v1/auth/mfa/disable',
      action: 'MFA_DISABLE',
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Two-factor authentication disabled successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST & PUT /api/v1/auth/change-password
 * Changes user password, validates policy, bumps tokenVersion, and clears mustChangePassword.
 */
const handleChangePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const schema = z.object({
      currentPassword: z.string().min(1).optional(),
      current_password: z.string().min(1).optional(),
      newPassword: z.string().min(1).optional(),
      new_password: z.string().min(1).optional(),
    });

    const body = schema.parse(req.body);
    const currentPassword = body.currentPassword || body.current_password;
    const newPassword = body.newPassword || body.new_password;

    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required' });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const match = await comparePassword(currentPassword, user.passwordHash);
    if (!match) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    // Enforce password policy
    const validation = validatePassword(newPassword, user.role);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const newTokenVersion = user.tokenVersion + 1;

    const updated = await prisma.adminUser.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        tokenVersion: newTokenVersion,
        mustChangePassword: false,
      },
    });

    // Issue fresh access token signed with incremented tokenVersion
    const tokenLifetime = updated.role.toUpperCase() === 'ADMIN' ? '2h' : '12h';
    const freshToken = signAccessToken(
      {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        tokenVersion: updated.tokenVersion,
        locationId: updated.locationId ?? null,
        mustChangePassword: false,
      },
      tokenLifetime
    );

    await logSecurityEvent({
      eventType: 'PASSWORD_CHANGED',
      severity: 'INFO',
      actorId: updated.id,
      actorUsername: updated.username,
      actorRole: updated.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      resource: req.originalUrl || req.path,
      action: 'CHANGE_PASSWORD',
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      access_token: freshToken,
      token: freshToken,
    });
  } catch (err) {
    next(err);
  }
};

authRouter.post('/change-password', requireAuth, handleChangePassword);
authRouter.put('/change-password', requireAuth, handleChangePassword);

/**
 * GET /api/v1/auth/me
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      include: { location: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name ?? user.username,
      role: user.role.toLowerCase(),
      status: user.status,
      locationId: user.locationId,
      locationName: user.location?.name ?? null,
      mustChangePassword: user.mustChangePassword,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/profile
 */
authRouter.get('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      include: { location: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name ?? user.username,
      contact: user.contact ?? '',
      email: user.email ?? '',
      employeeId: user.employeeId ?? '',
      shiftTime: user.shiftTime ?? 'General Shift',
      notes: user.notes ?? '',
      role: user.role.toLowerCase(),
      status: user.status,
      locationId: user.locationId,
      locationName: user.location?.name ?? null,
      locationCode: user.location?.code ?? null,
      locationCity: user.location?.city ?? null,
      sessionsProcessedCount: user.sessionsProcessedCount,
      dateAdded: user.createdAt.toISOString(),
      mustChangePassword: user.mustChangePassword,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/auth/profile
 * Allows users to update personal profile details.
 * Prevents mass-assignment: role, status, locationId, tokenVersion, mustChangePassword cannot be changed here.
 */
authRouter.put('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const schema = z.object({
      name: z.string().min(1).optional(),
      contact: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      employeeId: z.string().optional(),
      employee_id: z.string().optional(),
      shiftTime: z.string().optional(),
      shift_time: z.string().optional(),
      notes: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const resolvedEmployeeId = body.employeeId !== undefined ? body.employeeId : body.employee_id;
    const resolvedShiftTime = body.shiftTime !== undefined ? body.shiftTime : body.shift_time;

    const updated = await prisma.adminUser.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.contact !== undefined ? { contact: body.contact.trim() } : {}),
        ...(body.email !== undefined ? { email: body.email.trim() } : {}),
        ...(resolvedEmployeeId !== undefined ? { employeeId: resolvedEmployeeId.trim() } : {}),
        ...(resolvedShiftTime !== undefined ? { shiftTime: resolvedShiftTime.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes.trim() } : {}),
      },
      include: { location: true },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        username: updated.username,
        name: updated.name ?? updated.username,
        contact: updated.contact ?? '',
        email: updated.email ?? '',
        employeeId: updated.employeeId ?? '',
        shiftTime: updated.shiftTime ?? 'General Shift',
        notes: updated.notes ?? '',
        role: updated.role.toLowerCase(),
        status: updated.status,
        locationId: updated.locationId,
        locationName: updated.location?.name ?? null,
        locationCode: updated.location?.code ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});
