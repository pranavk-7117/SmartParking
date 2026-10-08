import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { z } from 'zod';

export const notificationsRouter = Router();

/**
 * GET /api/v1/notifications
 * Returns notifications for operator's assigned location or facility-wide broadcasts
 */
notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const operator = await prisma.adminUser.findUnique({
      where: { id: req.operator!.id },
      select: { locationId: true },
    });

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { locationId: null },
          ...(operator?.locationId ? [{ locationId: operator.locationId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        priority: n.priority,
        sender: n.sender,
        locationId: n.locationId,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    next(err);
  }
});

const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  message: z.string().min(1, 'Message is required').max(500),
  priority: z.enum(['INFO', 'WARNING', 'URGENT']).default('INFO'),
  sender: z.string().default('Facility Admin'),
  locationId: z.string().uuid().optional().nullable(),
});

/**
 * POST /api/v1/notifications
 * Admin posts an announcement or alert to operators
 */
notificationsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = createNotificationSchema.parse(req.body);

    const notification = await prisma.notification.create({
      data: {
        title: body.title,
        message: body.message,
        priority: body.priority,
        sender: body.sender,
        locationId: body.locationId || null,
      },
    });

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Dismiss or delete a notification
 */
notificationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Notification dismissed' });
  } catch (err) {
    next(err);
  }
});
