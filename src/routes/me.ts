import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

export const meRouter = Router();

/**
 * GET /api/v1/me/assignment
 * Returns the operator's assigned location for today.
 */
meRouter.get('/assignment', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const operator = await prisma.adminUser.findUnique({
      where: { id: userId },
      include: { location: true },
    });

    if (!operator || !operator.location) {
      throw new AppError('No location assignment found for this operator', 404);
    }

    const location = operator.location;

    res.json({
      location_id: location.id,
      location_name: location.name,
      location_code: location.code,
      city: location.city,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/me/today-summary
 * Real live daily metrics for today (entries, exits, currently parked, revenue)
 * Scoped strictly to caller's assigned site.
 */
meRouter.get('/today-summary', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const locationId = user.locationId;

    if (!locationId) {
      return res.json({
        entries: 0,
        exits: 0,
        currentlyParked: 0,
        todayRevenue: 0,
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Entries created today
    const entries = await prisma.parkingSession.count({
      where: {
        slot: { locationId },
        inTime: { gte: startOfDay },
      },
    });

    // Exits completed today
    const exits = await prisma.parkingSession.count({
      where: {
        slot: { locationId },
        status: 'COMPLETED',
        outTime: { gte: startOfDay },
      },
    });

    // Currently active parked vehicles
    const currentlyParked = await prisma.parkingSession.count({
      where: {
        slot: { locationId },
        status: 'ACTIVE',
      },
    });

    // Revenue collected today
    const bills = await prisma.bill.findMany({
      where: {
        session: {
          slot: { locationId },
        },
        generatedOn: { gte: startOfDay },
      },
      select: { amount: true },
    });

    const todayRevenue = bills.reduce((sum, b) => sum + Number(b.amount), 0);

    res.json({
      entries,
      exits,
      currentlyParked,
      todayRevenue: Math.round(todayRevenue),
    });
  } catch (err) {
    next(err);
  }
});

// Haversine formula to compute distance in meters between two lat/lng coordinates
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
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

// Known coordinates for default sites in Pune (fallback coordinates if not stored)
const SITE_COORDINATES: Record<string, { lat: number; lng: number; radiusMeters: number }> = {
  'site-camp': { lat: 18.5133, lng: 73.8784, radiusMeters: 500 },
  'site-hadapsar': { lat: 18.5089, lng: 73.9259, radiusMeters: 500 },
  'site-kothrud': { lat: 18.5074, lng: 73.8077, radiusMeters: 500 },
};

/**
 * POST /api/v1/me/location
 * Operator heartbeat / live location reporting.
 * Evaluates geofence boundary against the operator's assigned site.
 */
meRouter.post('/location', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new AppError('Valid latitude and longitude are required numbers', 400);
    }

    const operator = await prisma.adminUser.findUnique({
      where: { id: user.id },
      include: { location: true },
    });

    if (!operator) {
      throw new AppError('Operator not found', 404);
    }

    let geofenceStatus = 'INSIDE';
    let distanceToSiteMeters: number | null = null;
    let siteCoords: { lat: number; lng: number; radiusMeters: number } | null = null;

    if (operator.location) {
      const siteCode = operator.location.code;
      siteCoords = SITE_COORDINATES[siteCode] || { lat: 18.5204, lng: 73.8567, radiusMeters: 500 };
      distanceToSiteMeters = Math.round(
        calculateDistanceMeters(latitude, longitude, siteCoords.lat, siteCoords.lng)
      );

      if (distanceToSiteMeters > siteCoords.radiusMeters) {
        geofenceStatus = 'BREACHED';

        // Check if an active geofence alert was created recently (within last 5 minutes) to avoid alert fatigue
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingRecentAlert = await prisma.notification.findFirst({
          where: {
            title: `Geofence Alert: ${operator.name || operator.username}`,
            createdAt: { gte: fiveMinutesAgo },
          },
        });

        if (!existingRecentAlert) {
          await prisma.notification.create({
            data: {
              title: `Geofence Alert: ${operator.name || operator.username}`,
              message: `Operator ${operator.name || operator.username} moved ${distanceToSiteMeters}m away from assigned site "${operator.location.name}" (Allowed radius: ${siteCoords.radiusMeters}m).`,
              priority: 'WARNING',
              sender: 'Geofence Guard',
              locationId: operator.locationId,
            },
          });
        }
      }
    }

    // Update operator record in DB with latest coordinates and geofence state
    const updated = await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: new Date(),
        geofenceStatus,
      },
    });

    res.json({
      success: true,
      operatorId: updated.id,
      latitude: updated.lastLatitude,
      longitude: updated.lastLongitude,
      geofenceStatus: updated.geofenceStatus,
      distanceToSiteMeters,
      allowedRadiusMeters: siteCoords?.radiusMeters ?? 500,
      lastLocationUpdate: updated.lastLocationUpdate,
    });
  } catch (err) {
    next(err);
  }
});

