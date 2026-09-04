-- 1. CHECK constraint ensuring out_time is either NULL or strictly greater than in_time
ALTER TABLE "parking_sessions"
ADD CONSTRAINT "chk_parking_sessions_out_time"
CHECK ("out_time" IS NULL OR "out_time" > "in_time");

-- 2. Partial unique index ensuring a vehicle can have at most one row with status = 'ACTIVE'
CREATE UNIQUE INDEX "unique_active_vehicle_session"
ON "parking_sessions" ("vehicle_id")
WHERE "status" = 'ACTIVE';

-- 3. Partial unique index ensuring a slot can have at most one row with status = 'ACTIVE' (prevent double-booking)
CREATE UNIQUE INDEX "unique_active_slot_session"
ON "parking_sessions" ("slot_id")
WHERE "status" = 'ACTIVE';
