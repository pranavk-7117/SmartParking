import express from 'express';
import cors from 'cors';
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
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// ── Global Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

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
app.use('/api/v1/display', displayRouter);
app.use('/api/v1/entries', entriesRouter);
app.use('/api/v1/exits', exitsRouter);

// ── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);
