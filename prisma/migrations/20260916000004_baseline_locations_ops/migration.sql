-- Drop old global unique indexes that prevent multi-location slot codes and tariffs
DROP INDEX "rate_master_vehicle_type_key";
DROP INDEX "slots_location_code_key";

-- AlterTable locations: add operational metadata, rates and capacity
ALTER TABLE "locations" ADD COLUMN     "address" VARCHAR(255),
ADD COLUMN     "default_car_rate" DECIMAL(8,2),
ADD COLUMN     "default_scooter_rate" DECIMAL(8,2),
ADD COLUMN     "gate_info" VARCHAR(255),
ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
ADD COLUMN     "total_car_slots" INTEGER,
ADD COLUMN     "total_scooter_slots" INTEGER,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "code" SET DATA TYPE VARCHAR(50);

-- AlterTable slots: add deactivation audit fields and increase code length
ALTER TABLE "slots" ADD COLUMN     "deactivated_at" TIMESTAMPTZ,
ADD COLUMN     "deactivated_by" VARCHAR(100),
ADD COLUMN     "deactivation_reason" VARCHAR(255),
ALTER COLUMN "location_code" SET DATA TYPE VARCHAR(20);

-- AlterTable rate_master: add audit metadata and location scoping
ALTER TABLE "rate_master" ADD COLUMN     "last_updated_by" VARCHAR(100),
ADD COLUMN     "location_id" UUID;

-- AlterTable admin_users: add operator operational fields and profile metadata
ALTER TABLE "admin_users" ADD COLUMN     "auth_method" VARCHAR(50) NOT NULL DEFAULT 'Password',
ADD COLUMN     "contact" VARCHAR(50),
ADD COLUMN     "email" VARCHAR(100),
ADD COLUMN     "employee_id" VARCHAR(50),
ADD COLUMN     "name" VARCHAR(100),
ADD COLUMN     "notes" VARCHAR(255),
ADD COLUMN     "sessions_processed_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shift_time" VARCHAR(50),
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'Active';

-- CreateTable slot_deactivation_events
CREATE TABLE "slot_deactivation_events" (
    "id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "actioned_by" VARCHAR(100) NOT NULL,
    "actioned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_deactivation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable rate_history
CREATE TABLE "rate_history" (
    "id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "vehicle_type" "vehicle_type" NOT NULL,
    "old_rate" DECIMAL(8,2) NOT NULL,
    "new_rate" DECIMAL(8,2) NOT NULL,
    "changed_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable operator_reassignments
CREATE TABLE "operator_reassignments" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "from_location_id" UUID,
    "to_location_id" UUID NOT NULL,
    "reassigned_by" VARCHAR(100) NOT NULL,
    "reason" VARCHAR(255),
    "reassigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_reassignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "sender" VARCHAR(100) NOT NULL DEFAULT 'Admin',
    "location_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: composite site-scoped unique index for rate_master
CREATE UNIQUE INDEX "rate_master_location_id_vehicle_type_key" ON "rate_master"("location_id", "vehicle_type");

-- CreateIndex: composite site-scoped unique index for slots
CREATE UNIQUE INDEX "slots_location_id_location_code_key" ON "slots"("location_id", "location_code");

-- AddForeignKey constraints
ALTER TABLE "slot_deactivation_events" ADD CONSTRAINT "slot_deactivation_events_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slot_deactivation_events" ADD CONSTRAINT "slot_deactivation_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rate_master" ADD CONSTRAINT "rate_master_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rate_history" ADD CONSTRAINT "rate_history_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operator_reassignments" ADD CONSTRAINT "operator_reassignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operator_reassignments" ADD CONSTRAINT "operator_reassignments_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operator_reassignments" ADD CONSTRAINT "operator_reassignments_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
