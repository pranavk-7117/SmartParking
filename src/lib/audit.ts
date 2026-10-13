import prisma from './prisma';

export interface SecurityEventData {
  eventType: string;
  severity: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';
  actorId?: string | null;
  actorUsername?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  locationId?: string | null;
  resource?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  action: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details?: Record<string, any>;
}

// In-memory sliding window cache for rate-limiting repetitive 401/403 security logs:
// Max 1 DB audit log write per 30 seconds per unique IP + eventType + action
const deduplicationWindow = new Map<string, number>();
const DEDUP_TTL_MS = 30 * 1000;

export async function logSecurityEvent(event: SecurityEventData): Promise<void> {
  try {
    const isDenial = event.status === 'BLOCKED' || event.status === 'FAILURE';
    const now = Date.now();

    if (isDenial && event.ipAddress) {
      const dedupKey = `${event.ipAddress}:${event.eventType}:${event.action}`;
      const lastLogged = deduplicationWindow.get(dedupKey);

      if (lastLogged && now - lastLogged < DEDUP_TTL_MS) {
        // Suppress repetitive log spam within 30s window
        return;
      }
      deduplicationWindow.set(dedupKey, now);

      // Periodic memory cleanup of old keys (every ~100 entries)
      if (deduplicationWindow.size > 200) {
        for (const [key, ts] of deduplicationWindow.entries()) {
          if (now - ts > DEDUP_TTL_MS) {
            deduplicationWindow.delete(key);
          }
        }
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[SECURITY_AUDIT] ${new Date().toISOString()} [${event.severity}] ${event.eventType} - ${event.action} (${event.status}) - Actor: ${event.actorUsername ?? event.actorId ?? 'unknown'}`
      );
    }

    await prisma.securityAuditLog.create({
      data: {
        eventType: event.eventType,
        severity: event.severity,
        actorId: event.actorId ?? null,
        actorUsername: event.actorUsername ?? null,
        actorRole: event.actorRole ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        locationId: event.locationId ?? null,
        resource: event.resource ?? null,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        action: event.action,
        status: event.status,
        details: event.details ?? undefined,
      },
    });
  } catch (err) {
    // Fail-safe: audit log persistence errors must never crash request pipeline
    console.error('[SECURITY_AUDIT_ERROR] Failed to persist security audit event:', err);
  }
}
