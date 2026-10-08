import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/login
 * Authenticate admin / operator → return JWT access_token + profile details.
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.adminUser.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
      },
      include: { location: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    if (user.status === 'Terminated') {
      res.status(403).json({ error: 'This user account has been terminated' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        locationId: user.locationId ?? null,
      },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    const userProfile = {
      id: user.id,
      username: user.username,
      name: user.name ?? user.username,
      role: user.role.toLowerCase(),
      status: user.status,
      locationId: user.locationId,
      locationName: user.location?.name ?? null,
      lastLogin: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

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
 * GET /api/v1/auth/me
 * Returns current authenticated user profile from token.
 */
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.operator!.id;
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
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/profile
 * Returns detailed operator profile
 */
authRouter.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.operator!.id;
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
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/auth/profile
 * Updates operator profile details (name, username, contact, email, employeeId, shiftTime, notes)
 */
authRouter.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.operator!.id;
    const schema = z.object({
      name: z.string().min(1).optional(),
      username: z.string().min(3).optional(),
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

    // If username is changing, verify uniqueness
    if (body.username) {
      const trimmedUsername = body.username.trim().toLowerCase();
      const existing = await prisma.adminUser.findFirst({
        where: {
          username: trimmedUsername,
          NOT: { id: userId },
        },
      });

      if (existing) {
        res.status(400).json({ error: 'Username is already taken by another user' });
        return;
      }
    }

    const updated = await prisma.adminUser.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.username !== undefined ? { username: body.username.trim().toLowerCase() } : {}),
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

/**
 * POST /api/v1/auth/change-password
 * Verifies current password and updates to new password
 */
authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const userId = req.operator!.id;
    const schema = z.object({
      currentPassword: z.string().min(1).optional(),
      current_password: z.string().min(1).optional(),
      newPassword: z.string().min(6).optional(),
      new_password: z.string().min(6).optional(),
    });

    const body = schema.parse(req.body);
    const currentPassword = body.currentPassword || body.current_password;
    const newPassword = body.newPassword || body.new_password;

    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

