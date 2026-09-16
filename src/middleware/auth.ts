import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface OperatorPayload {
  id: string;
  username: string;
  role: string;
  locationId: string | null;
}

// Extend the Express Request type to carry the decoded operator
declare global {
  namespace Express {
    interface Request {
      operator?: OperatorPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as OperatorPayload;
    req.operator = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
