# Smart Parking Management System — Database Layer

This repository contains the database layer and schema implementation for the Smart Parking Management System, built strictly using PostgreSQL and Prisma ORM with Node.js & TypeScript.

---

## 🏗️ Architecture & Schema Overview

The database layer consists of **6 models** mapped to PostgreSQL with custom constraints and indexes for high concurrency, data integrity, and deterministic billing.

### Models & Tables

1. **`vehicles`** (`Vehicle`):
   - `id`: UUID (Primary Key)
   - `vehicle_number`: `VARCHAR(15)` (Unique, Not Null)
   - `vehicle_type`: `ENUM('CAR', 'SCOOTER')` (Not Null)
   - `created_at`: `TIMESTAMPTZ` (Default: `now()`)

2. **`slots`** (`Slot`):
   - `id`: UUID (Primary Key)
   - `location_code`: `VARCHAR(10)` (Unique, Not Null)
   - `slot_type`: `ENUM('CAR', 'SCOOTER')` (Not Null)
   - `status`: `ENUM('VACANT', 'OCCUPIED', 'OUT_OF_SERVICE')` (Default: `VACANT`)
   - `created_at`: `TIMESTAMPTZ` (Default: `now()`)
   - `updated_at`: `TIMESTAMPTZ` (Auto-updated)
   - **Index**: Composite index on `(slot_type, status)` for fast lookup of vacant slots.

3. **`rate_master`** (`RateMaster`):
   - `id`: UUID (Primary Key)
   - `vehicle_type`: `ENUM('CAR', 'SCOOTER')` (Unique, Not Null)
   - `rate_per_hour`: `DECIMAL(8,2)` (Not Null)
   - `effective_from`: `DATE` (Not Null)
   - `created_at`: `TIMESTAMPTZ` (Default: `now()`)

4. **`parking_sessions`** (`ParkingSession`):
   - `id`: UUID (Primary Key)
   - `vehicle_id`: UUID (Foreign Key -> `vehicles.id`, `onDelete: Restrict`)
   - `slot_id`: UUID (Foreign Key -> `slots.id`, `onDelete: Restrict`)
   - `in_time`: `TIMESTAMPTZ` (Not Null)
   - `out_time`: `TIMESTAMPTZ` (Nullable)
   - `status`: `ENUM('ACTIVE', 'COMPLETED')` (Default: `ACTIVE`)
   - `created_at`: `TIMESTAMPTZ` (Default: `now()`)
   - **Indexes**:
     - Index on `(status)`
     - Composite index on `(vehicle_id, status)`

5. **`bills`** (`Bill`):
   - `id`: UUID (Primary Key)
   - `session_id`: UUID (Foreign Key -> `parking_sessions.id`, Unique, `onDelete: Cascade`)
   - `duration_minutes`: `INTEGER` (Not Null)
   - `rate_applied`: `DECIMAL(8,2)` (Snapshot of rate at billing time, historical integrity)
   - `amount`: `DECIMAL(10,2)` (Not Null)
   - `generated_on`: `TIMESTAMPTZ` (Default: `now()`)

6. **`admin_users`** (`AdminUser`):
   - `id`: UUID (Primary Key)
   - `username`: `VARCHAR(50)` (Unique, Not Null)
   - `password_hash`: `VARCHAR(255)` (Not Null, bcrypt hash)
   - `role`: `ENUM('ADMIN', 'OPERATOR')` (Not Null)
   - `created_at`: `TIMESTAMPTZ` (Default: `now()`)

---

## 🛡️ Database Constraints (Migration 2)

Custom PostgreSQL constraints and partial unique indexes enforced via migration `20260904000002_add_custom_constraints`:

1. **`CHECK` Constraint on Timestamps**:
   ```sql
   ALTER TABLE "parking_sessions"
   ADD CONSTRAINT "chk_parking_sessions_out_time"
   CHECK ("out_time" IS NULL OR "out_time" > "in_time");
   ```
2. **One Active Session Per Vehicle** (Partial Unique Index):
   ```sql
   CREATE UNIQUE INDEX "unique_active_vehicle_session"
   ON "parking_sessions" ("vehicle_id")
   WHERE "status" = 'ACTIVE';
   ```
3. **Prevent Slot Double-Booking** (Partial Unique Index):
   ```sql
   CREATE UNIQUE INDEX "unique_active_slot_session"
   ON "parking_sessions" ("slot_id")
   WHERE "status" = 'ACTIVE';
   ```

---

## 🚀 Setup & Execution Guide

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL instance running locally or via Docker

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your database connection string:
```bash
cp .env.example .env
```
Example `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_parking_db?schema=public"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migrations
Run Prisma migrations to apply the schema and custom SQL constraints:
```bash
npm run db:migrate
```
Or to deploy existing migrations in production/CI:
```bash
npx prisma migrate deploy
```

### 5. Generate Prisma Client
```bash
npm run db:generate
```

### 6. Seed the Database
Run the idempotent seed script to populate sample rate master, slots, vehicles, test sessions/bills, and an admin user:
```bash
npm run db:seed
```

**Seeded Data Summary:**
- **Rates**: CAR (`₹40.00/hr`), SCOOTER (`₹20.00/hr`)
- **Slots**: 10 vacant slots (`C-01` to `C-05`, `S-01` to `S-05`)
- **Vehicles**: 4 sample vehicles (`KA-01-AB-1234`, `MH-12-CD-5678`, `DL-04-EF-9012`, `TN-09-GH-3456`)
- **Sessions & Bills**: 2 completed parking sessions with generated bills
- **Admin**: `username: admin`, `password: Admin@12345` (bcrypt hashed)

### 7. Reset Database
To completely wipe and re-apply migrations and seed data:
```bash
npm run db:reset
```

### 8. Run Smoke Tests
Run the automated verification suite to validate relational queries and constraint enforcement:
```bash
npm run test:smoke
```
Tests:
- **Test 1**: Single Prisma query reading vehicle -> session -> bill hierarchy via `include`.
- **Test 2**: Enforces rejection of a second `ACTIVE` session for the same vehicle.
- **Test 3**: Enforces rejection of double-booking a slot (`ACTIVE` session on the same slot).
- **Test 4**: Enforces `CHECK` constraint failure when `out_time <= in_time`.
