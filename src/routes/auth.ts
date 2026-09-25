import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const prisma = new PrismaClient();
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

    res.status(200).json({
      access_token: token,
      operator_id: user.id,
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
