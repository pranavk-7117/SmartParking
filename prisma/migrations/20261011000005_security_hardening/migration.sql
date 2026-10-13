-- 1. Enum update for soft-voided sessions (idempotent)
ALTER TYPE "session_status" ADD VALUE IF NOT EXISTS 'VOIDED';

-- 2. Parking sessions void audit columns
ALTER TABLE "parking_sessions" ADD COLUMN     "void_reason" VARCHAR(255),
ADD COLUMN     "voided_at" TIMESTAMPTZ,
ADD COLUMN     "voided_by" VARCHAR(100);

-- 3. Admin users security, token versioning, password rotation and MFA columns
ALTER TABLE "admin_users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" VARCHAR(255),
ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4. Security Audit Log Table
CREATE TABLE "security_audit_logs" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "actor_id" VARCHAR(100),
    "actor_username" VARCHAR(50),
    "actor_role" VARCHAR(50),
    "ip_address" VARCHAR(50),
    "user_agent" VARCHAR(255),
    "location_id" UUID,
    "resource" VARCHAR(100),
    "target_type" VARCHAR(50),
    "target_id" VARCHAR(100),
    "action" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "details" JSONB,

    CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_audit_logs_event_type_idx" ON "security_audit_logs"("event_type");
CREATE INDEX "security_audit_logs_actor_id_idx" ON "security_audit_logs"("actor_id");
CREATE INDEX "security_audit_logs_actor_username_idx" ON "security_audit_logs"("actor_username");
CREATE INDEX "security_audit_logs_location_id_idx" ON "security_audit_logs"("location_id");
CREATE INDEX "security_audit_logs_timestamp_idx" ON "security_audit_logs"("timestamp");

-- 5. DB-Backed Lockout / Login Attempts Table
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(50) NOT NULL,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successful" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempts_username_ip_address_attempted_at_idx" ON "login_attempts"("username", "ip_address", "attempted_at");
CREATE INDEX "login_attempts_attempted_at_idx" ON "login_attempts"("attempted_at");

-- 6. Hand-added single admin partial unique index
CREATE UNIQUE INDEX "unique_single_admin_role"
ON "admin_users" ("role")
WHERE "role" = 'ADMIN';
