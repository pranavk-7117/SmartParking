/**
 * src/middleware/rateLimiter.ts
 * Rate limiters for the AeroPark Smart Parking API.
 *
 * Three tiers per API_CONTRACT.md:
 *  - globalLimiter  : 300 req / 15 min per IP (all authenticated routes)
 *  - loginLimiter   : 10  req / 15 min per IP (applied in auth router)
 *  - kioskLimiter   : 120 req / 1  min per IP (GET /api/v1/display/:siteId)
 *  - apkLimiter     : 10  req / 1  hour per IP (APK download endpoint)
 */
import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

/** Shared headers format (RateLimit-* draft-7 headers) */
const sharedOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
};

// ── Global limiter ────────────────────────────────────────────────────────────
// Applied to all API routes. 5,000 requests per 15-minute window to accommodate live dashboard polling.
export const globalLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1_000,
  max: 5000,
  message: {
    error: 'Too many requests, please slow down',
    retryAfter: 60,
  },
  skip: (req) => {
    // Skip rate limiting in development or loopback/local traffic
    if (!isProduction) return true;
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.includes('172.') || ip.includes('192.168.');
  },
});

// ── Login limiter ─────────────────────────────────────────────────────────────
// Layered on top of the auth route. 50 attempts / 15 min to prevent lockouts during active use.
export const loginLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1_000,
  max: 50,
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: 60,
  },
  skip: () => !isProduction,
});

// ── Kiosk display limiter ─────────────────────────────────────────────────────
// Public endpoint.  120 req / min supports up to ~20 kiosks polling every 10 s
// behind a single shared NAT gateway, as per API_CONTRACT.md §3.4.
export const kioskLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 1_000,
  max: 120,
  message: {
    error: 'Display endpoint rate limit exceeded',
    retryAfter: 60,
  },
});

// ── APK download limiter ──────────────────────────────────────────────────────
// Obfuscated distribution endpoint.  10 req / hour per IP prevents scraping
// while allowing legitimate re-downloads (e.g. device replacement).
export const apkLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1_000,
  max: 10,
  message: {
    error: 'APK download rate limit exceeded. Try again later.',
    retryAfter: 3600,
  },
});
