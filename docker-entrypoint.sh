#!/bin/sh
set -e

echo "[entrypoint] Starting ParkIT Backend container..."

# ── 1. Database Migrations ──────────────────────────────────────────────────
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  npx prisma migrate deploy
  echo "[entrypoint] Migrations completed successfully."
fi

# ── 2. Database Seeding ─────────────────────────────────────────────────────
if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "[entrypoint] Seeding database (idempotent upserts)..."
  node prisma/seed.js
  echo "[entrypoint] Seeding completed."
fi

# ── 3. Start Application ───────────────────────────────────────────────────
echo "[entrypoint] Handing over to: $*"
exec "$@"
