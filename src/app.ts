import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import { locationsRouter } from './routes/locations';
import { sessionsRouter } from './routes/sessions';
import { ratesRouter } from './routes/rates';
import { entriesRouter } from './routes/entries';
import { exitsRouter } from './routes/exits';
import { sitesRouter } from './routes/sites';
import { slotsRouter } from './routes/slots';
import { operatorsRouter } from './routes/operators';
import { reportsRouter } from './routes/reports';
import { displayRouter } from './routes/display';
import { notificationsRouter } from './routes/notifications';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter, kioskLimiter } from './middleware/rateLimiter';

export const app = express();

// ── Trust Proxy ───────────────────────────────────────────────────────────────
// Required for express-rate-limit to use the real client IP when behind Nginx.
// '1' means we trust exactly one proxy hop (the Nginx reverse proxy).
app.set('trust proxy', 1);

// ── Global Middleware ────────────────────────────────────────────────────────

// Helmet: sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security, Content-Security-Policy, etc.)
app.use(helmet());

// CORS allowlist — sourced from CORS_ALLOWED_ORIGINS env var (comma-separated).
// An empty allowlist means no browser origin is allowed (API-only / server-side calls).
const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
    exposedHeaders: ['X-Total-Count'], // Required for pagination header visibility in browsers
  })
);

// Body cap: 100 kb as specified in the API contract.
// Prevents large-payload DoS and is sufficient for all current endpoints.
app.use(express.json({ limit: '100kb' }));

// ── Global Rate Limiter ───────────────────────────────────────────────────────
// Applied before all routes.  300 req / 15 min per IP.
app.use(globalLimiter);

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/me', meRouter);
app.use('/api/v1/locations', locationsRouter);
app.use('/api/v1/sites', sitesRouter);
app.use('/api/v1/slots', slotsRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/rates', ratesRouter);
app.use('/api/v1/operators', operatorsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/entries', entriesRouter);
app.use('/api/v1/exits', exitsRouter);
app.use('/api/v1/notifications', notificationsRouter);

// Public kiosk display — separate, stricter rate limit (120 req/min per IP)
app.use('/api/v1/display', kioskLimiter, displayRouter);

// ── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);
