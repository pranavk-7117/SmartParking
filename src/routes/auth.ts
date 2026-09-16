import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/login
 * Authenticate operator → return JWT access_token + operator details.
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
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
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
});
