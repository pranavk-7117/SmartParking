import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import prisma from '../lib/prisma';
import { z } from 'zod';

export const notificationsRouter = Router();

/**
 * GET /api/v1/notifications
 * Returns notifications for operator's assigned location or facility-wide broadcasts
 */
notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const locationId = user.locationId;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { locationId: null },
          ...(locationId ? [{ locationId }] : []),
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
  locationId: z.string().uuid().optional().nullable(),
});

/**
 * POST /api/v1/notifications
 * Admin posts an announcement or alert to operators (Admin Only).
 * Sender is strictly derived from authenticated user identity.
 */
notificationsRouter.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = createNotificationSchema.parse(req.body);
    const sender = req.user?.username ?? 'Admin';

    const notification = await prisma.notification.create({
      data: {
        title: body.title,
        message: body.message,
        priority: body.priority,
        sender,
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
 * Dismiss or delete a notification (Admin Only).
 */
notificationsRouter.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    try {
      await prisma.notification.delete({ where: { id } });
    } catch {
      // Record already deleted or does not exist
    }
    res.json({ message: 'Notification dismissed' });
  } catch (err) {
    next(err);
  }
});
