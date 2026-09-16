-- Add locations table
CREATE TABLE "locations" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       VARCHAR(100) NOT NULL,
  "code"       VARCHAR(20)  NOT NULL,
  "city"       VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "locations_code_key" UNIQUE ("code")
);

-- Add location_id FK to slots (nullable — existing rows keep NULL)
ALTER TABLE "slots"
  ADD COLUMN "location_id" UUID,
  ADD CONSTRAINT "slots_location_id_fkey"
    FOREIGN KEY ("location_id")
    REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Composite index for availability queries
CREATE INDEX "slots_location_id_slot_type_status_idx"
  ON "slots"("location_id", "slot_type", "status");

-- Add location_id FK to admin_users (nullable — existing operator accounts still work)
ALTER TABLE "admin_users"
  ADD COLUMN "location_id" UUID,
  ADD CONSTRAINT "admin_users_location_id_fkey"
    FOREIGN KEY ("location_id")
    REFERENCES "locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
