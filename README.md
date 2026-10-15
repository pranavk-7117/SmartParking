# ParkIT — Parking Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-5A67D8.svg)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0+-7F52FF.svg)](https://kotlinlang.org/)
[![Android](https://img.shields.io/badge/Android-8.0%2B-3DDC84.svg)](https://developer.android.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

A modern parking facility management platform built for municipal and commercial parking lots:

| Component | Description |
|---|---|
| **Backend API** | Express + TypeScript REST API with security hardening, audit logs, and PostgreSQL via Prisma |
| **Admin Dashboard** | React + Vite web application for facility administrators (Slot live view, site editing, operator management, session history, reports) |
| **Operator App** | Native Android (Jetpack Compose) handheld app for gate staff — offline-first with room local cache |

---

- [Quick Start (Docker)](#quick-start-docker)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Backend API](#backend-api)
  - [Tech Stack](#backend-tech-stack)
  - [API Reference](#api-reference)
  - [Database Schema](#database-schema)
  - [Getting Started (Backend)](#getting-started-backend)
- [Admin Dashboard (Frontend)](#admin-dashboard-frontend)
  - [Features](#admin-dashboard-features)
  - [Getting Started (Frontend)](#getting-started-frontend)
- [Operator Android App](#operator-android-app)
  - [Tech Stack](#android-tech-stack)
  - [Core Screens](#core-screens)
  - [Offline-First Architecture](#offline-first-architecture)
  - [Getting Started (Android)](#getting-started-android)
- [Available Scripts](#available-scripts)
- [License](#license)

---

## Quick Start (Docker)

The fastest and most reliable way to run the entire ParkIT system (PostgreSQL 16, Node.js API, React Web Dashboard):

### 1. Start All Containers
```bash
# Windows
start.bat

# Or directly with Docker Compose
docker compose up -d
```

### 2. Access the Application
* **Admin Dashboard:** [http://localhost:5173](http://localhost:5173)
* **Backend API Health:** [http://localhost:5173/api/v1/health](http://localhost:5173/api/v1/health) (or port 3000)
* **Operator Android APK:** [http://localhost:5173/download/operator-app.apk](http://localhost:5173/download/operator-app.apk)

### 3. Default Credentials
| Role | Username | Default Password | Environment Variable |
|---|---|---|---|
| **Admin** | `admin` | `change_me_admin_password` | `ADMIN_PASSWORD` |
| **Operator** | `operator` | `change_me_operator_password` | `OPERATOR_PASSWORD` |

> [!NOTE]
> All credentials and configurations can be customized via `.env` without touching any source code.
> The database automatically migrates and seeds 1 facility (`ParkIT – Camp`), 45 parking slots (30 Car, 15 Scooter), 1 Admin, and 1 Operator on initial startup.

---

## System Architecture

```mermaid
flowchart LR
    subgraph "Admin Dashboard (React)"
        A["Login / Auth"]
        B["Live Slot Dashboard"]
        C["Operator Management"]
        D["Reports & Revenue"]
        E["Rates & Locations"]
    end

    subgraph "Backend API (Express + TypeScript)"
        F["REST API :3000"]
        G["JWT Middleware"]
        H["Prisma ORM"]
    end

    subgraph "PostgreSQL Database"
        I[("admin_users\nlocations\nslots\nvehicles\nparkingsessions\nbills\nrate_master")]
    end

    subgraph "Operator App (Android / Compose)"
        J["Login Screen"]
        K["Home Dashboard"]
        L["Entry Capture (CameraX + ML Kit)"]
        M["Exit & Billing"]
        N["Settings & Profile"]
        O["Room DB (Offline Cache)"]
    end

    A & B & C & D & E --> F
    J & K & L & M & N --> F
    F --> G --> H --> I
    O -. sync .-> F
```

---

## Repository Structure

```
.
├── src/                          # Backend API source (TypeScript)
│   ├── app.ts                    # Express app factory
│   ├── index.ts                  # Server entry point
│   ├── middleware/
│   │   ├── auth.ts               # JWT authentication middleware
│   │   └── errorHandler.ts       # Global error handler
│   └── routes/
│       ├── auth.ts               # Login, profile, change-password
│       ├── entries.ts            # Vehicle entry (gate-in)
│       ├── exits.ts              # Vehicle exit + billing
│       ├── locations.ts          # Location info + live slot availability
│       ├── me.ts                 # Current user profile + today's summary
│       ├── notifications.ts      # Admin announcements
│       ├── operators.ts          # Operator CRUD (admin only)
│       ├── rates.ts              # Parking rate management
│       ├── reports.ts            # Revenue and session reports
│       ├── sessions.ts           # Active/historical session queries
│       ├── sites.ts              # Site management
│       └── slots.ts              # Slot status management
├── prisma/
│   ├── schema.prisma             # Prisma data model
│   ├── seed.ts                   # Idempotent database seeder
│   └── migrations/               # Versioned migration history
├── frontend/                     # Admin Dashboard (React + Vite + Tailwind)
│   └── src/
│       ├── pages/                # Dashboard pages (login, home, reports, etc.)
│       ├── components/           # Shared UI components
│       ├── api/                  # API client layer
│       └── context/              # Auth + app context
├── operator-app/                 # Native Android Operator App (Kotlin + Compose)
│   └── app/src/main/java/.../
│       ├── ui/screens/           # Compose screens (home, entry, exit, settings)
│       ├── data/repository/      # ParkingRepository + AuthRepository
│       ├── data/remote/dto/      # Retrofit DTOs
│       ├── data/local/entity/    # Room entities
│       └── data/local/           # AppDatabase (Room)
├── test/
│   ├── smoke.ts                  # Database constraint verification tests
│   └── api.ts                   # API integration tests
├── docs/
│   └── API_CONTRACT_ADDENDUM.md  # API contract documentation
├── .env.example                  # Environment variable template
├── package.json
└── tsconfig.json
```

---

## Backend API

### Backend Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express 4 |
| Language | TypeScript 5.7+ |
| ORM | Prisma 6 |
| Database | PostgreSQL 16+ |
| Auth | JSON Web Tokens (JWT) + bcryptjs |
| Validation | Zod |

### API Reference

All routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

#### Authentication & Security

All calls to `POST /api/v1/auth/login` require the header:
* `X-Client-Type: admin-web` for Administrative web logins
* `X-Client-Type: operator-android` for Mobile handheld attendants

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login with lockout protection (5 fails/15m) and role segregation |
| `POST` | `/auth/logout` | ✅ | Revoke session tokens immediately (bumps `tokenVersion`) |
| `POST` | `/auth/mfa/setup` | ✅ Admin | Generate TOTP secret and backup recovery codes |
| `POST` | `/auth/mfa/verify` | ✅ Admin | Verify initial TOTP 6-digit code and activate MFA |
| `POST` | `/auth/mfa/login` | — | Complete MFA challenge with TOTP code or recovery code |
| `POST` | `/auth/mfa/disable`| ✅ Admin | Disable TOTP MFA with password confirmation |
| `GET` | `/auth/me` | ✅ | Get fresh database user profile and site assignment |
| `PUT` | `/auth/profile` | ✅ | Update profile (role/site mass-assignment protected) |
| `POST` | `/auth/change-password` | ✅ | Change password (enforces password complexity) |

#### Locations & Availability

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/locations` | ✅ | List all locations |
| `GET` | `/locations/:id/availability` | ✅ | Live slot availability including `car_total`, `scooter_total`, `total_slots` |

#### Parking Operations

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/entries` | ✅ | Record vehicle entry (idempotency key supported) |
| `POST` | `/exits` | ✅ | Process vehicle exit, compute bill |
| `GET` | `/sessions` | ✅ | List sessions (filterable by status/location) |

#### Operator & Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/operators` | ✅ Admin | List all operators |
| `POST` | `/operators` | ✅ Admin | Create operator (sets username + password) |
| `PUT` | `/operators/:id` | ✅ Admin | Update operator |
| `DELETE` | `/operators/:id` | ✅ Admin | Delete operator |
| `GET` | `/me/today-summary` | ✅ | Today's entries, exits, parked count, revenue |
| `GET` | `/notifications` | ✅ | Admin announcements |

#### Rates & Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/rates` | ✅ | Get current parking rates |
| `PUT` | `/rates` | ✅ Admin | Update rates |
| `GET` | `/reports` | ✅ Admin | Revenue reports |

### Database Schema

```mermaid
erDiagram
    admin_users {
        uuid id PK
        varchar username UK
        varchar password_hash
        admin_role role
        varchar display_name
        int token_version
        boolean must_change_password
        boolean mfa_enabled
        timestamptz created_at
    }

    security_audit_logs {
        uuid id PK
        varchar event_type
        varchar severity
        uuid actor_id FK
        varchar resource
        varchar action
        varchar status
        timestamptz timestamp
    }

    locations {
        uuid id PK
        varchar name
        varchar code UK
        int totalCarSlots
        int totalScooterSlots
    }

    vehicles {
        uuid id PK
        varchar vehicle_number UK
        vehicle_type vehicle_type
        timestamptz created_at
    }

    slots {
        uuid id PK
        uuid location_id FK
        varchar location_code UK
        vehicle_type slot_type
        slot_status status
    }

    rate_master {
        uuid id PK
        vehicle_type vehicle_type UK
        decimal rate_per_hour
        date effective_from
    }

    parking_sessions {
        uuid id PK
        uuid vehicle_id FK
        uuid slot_id FK
        uuid operator_id FK
        timestamptz in_time
        timestamptz out_time
        session_status status
        varchar void_reason
        uuid voided_by FK
        timestamptz voided_at
    }

    bills {
        uuid id PK
        uuid session_id FK
        integer duration_minutes
        decimal rate_applied
        decimal amount
        timestamptz generated_on
    }

    vehicles ||--o{ parking_sessions : "has"
    slots ||--o{ parking_sessions : "allocated to"
    parking_sessions ||--o| bills : "billed by"
    locations ||--o{ slots : "contains"
    admin_users ||--o{ parking_sessions : "operated by"
    admin_users ||--o{ security_audit_logs : "audits"
```
## 🔒Security Hardening & Infrastructure Updates 

The project has been successfully updated with comprehensive backend gateway security, API validation, and Android client protections:

### 1. Backend Gateway & API Hardening
* **Gateway Security:** Implemented `helmet`, explicit CORS allowlist policies, trust proxy configuration, and a 100kb request body size cap.
* **Tiered Rate Limiting (`src/middleware/rateLimiter.ts`):** 
  * Global API: 300 requests / 15 min per IP.
  * Login endpoints: 10 requests / 15 min per username + IP with uniform lockout and timing-invariant responses to prevent user enumeration.
  * Kiosk display: 120 requests / 1 min per IP.
  * APK distribution route: 10 requests / 1 hour per IP.
* **Error Handling & Audit Logging:** Production error responses are sanitized to mask internal details, returning UUID-based `incidentId` trackers while logging full error stacks securely server-side.
* **Session Management & Soft-Voiding (`src/routes/sessions.ts`):** 
  * Implemented administrative soft-voiding (`POST /api/v1/sessions/:id/void`) with mandatory audit reasons, slot liberation, and audit logging.
  * Explicitly deprecated direct session deletion, returning `405 Method Not Allowed` on `DELETE /api/v1/sessions/:id`.
* **Strict Validation:** Zod schemas enforce timestamp bounds ($\le 5$ min future, $\le 24$ h past), vehicle plate regex, and site-scoped access control across all operations routes.

### 2. Android Operator App Security
* **Network Security Config:** Enforced system trust anchors and disabled cleartext traffic (`android:usesCleartextTraffic="false"`) and backups (`android:allowBackup="false"`).
* **API Client Interceptors (`ApiClient.kt`):** Automatically injects the `X-Client-Type: operator-android` header and strips HTTP body logging in release builds (`BuildConfig.DEBUG`).
* **Build & Obfuscation:** Configured release builds with `isMinifyEnabled = true` and strict ProGuard keep rules for Retrofit, Gson, and CameraX.
* **Secure Session Handling:** Integrated automatic session revocation and logout handling upon receiving `401 Unauthorized` responses.

### 3. Deployment & Infrastructure
* **Docker Support:** Added optimized `Dockerfile`, `docker-compose.yml`, and `.dockerignore` for containerized deployments.
* **Production Documentation:** Added comprehensive deployment runbooks under `docs/security/PRODUCTION_DEPLOYMENT.md` covering Nginx reverse proxy configs, CSP headers, and VPC security groups.

#### Custom PostgreSQL Constraints

Enforced via migration `20260904000002_add_custom_constraints`:

1. **Timestamp sanity** — `out_time` must be `NULL` or strictly greater than `in_time`.
2. **One active session per vehicle** — Partial unique index prevents duplicate entry for an already-parked vehicle.
3. **No slot double-booking** — Partial unique index prevents two concurrent sessions sharing the same slot.

### Getting Started (Backend)

#### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+

#### Environment Setup
```bash
cp .env.example .env
```
Edit `.env`:
```env
DATABASE_URL="postgresql://<USER>:<PASSWORD>@localhost:5432/<DB>?schema=public"
JWT_SECRET="your-secret-key"
```

#### Install & Migrate
```bash
npm install
npm run db:migrate
npm run db:generate
npm run db:seed
```

#### Run Development Server
```bash
npm run dev        # Starts on http://localhost:3000
```

#### Available Backend Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run db:migrate` | Run pending Prisma migrations |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:seed` | Seed baseline data |
| `npm run db:reset` | Drop DB, re-migrate, re-seed |
| `npm run test:smoke` | Run DB constraint verification suite |
| `npm run test:api` | Run API integration tests |
| `npx ts-node test/auth-identity-audit.test.ts` | Run authentication, lockout, token revocation & MFA tests |
| `npx ts-node test/authorization-matrix.test.ts` | Run 4-actor authorization matrix & route allowlist audit |

---

## Admin Dashboard (Frontend)

A React + Vite + Tailwind CSS admin web application served from `frontend/`.

### Admin Dashboard Features

- **Live Slot Availability** — Real-time card view per location with car/scooter/total counts
- **Operator Management** — Create operators (set username & password), edit, deactivate
- **Parking Sessions** — Live view of active vehicles, historical session lookup
- **Revenue Reports** — Daily/weekly/monthly revenue breakdown
- **Rate Management** — Update hourly parking rates per vehicle type
- **Site/Location Management** — Add and configure parking locations

### Getting Started (Frontend)

```bash
cd frontend
npm install
npm run dev        # Starts on http://localhost:5173
```

The frontend proxies all `/api/v1` requests to the backend at `http://localhost:3000`.

For a production build:
```bash
npm run build      # Outputs to frontend/dist/
```

---

## Operator Android App

A native Android application for gate-level parking operators. Located in `operator-app/`.

> A pre-built debug APK is available at `frontend/public/operator-app.apk` and can be downloaded directly from the admin dashboard.

### Android Tech Stack

| Layer | Technology |
|---|---|
| Language | Kotlin 2.0+ (JVM 17) |
| UI | Jetpack Compose + Material 3 |
| Camera | CameraX |
| OCR | Google ML Kit Text Recognition (on-device) |
| Local DB | Room 2.6+ (v2) |
| Networking | Retrofit 2 + OkHttp 4 + Gson |
| Background Sync | AndroidX WorkManager |
| Secure Storage | EncryptedSharedPreferences (AES-256 GCM) |
| Min SDK | 26 (Android 8.0+) |

### Core Screens

| Screen | Description |
|---|---|
| **Login** | Username/password login; offline fallback using cached credentials |
| **Home Dashboard** | Assigned location name, live Car/Scooter/Total slot availability (dynamic from backend), today's entries/exits/revenue, gate entry/exit actions |
| **Capture Entry** | Full-screen CameraX viewfinder + ML Kit OCR plate extraction, vehicle type selector, confirm entry |
| **Capture Exit** | Plate lookup, session details, bill computation (ceiling-hour pricing), receipt screen |
| **Active Sessions** | Live Room `Flow`-backed list of parked vehicles; unsynced entries show "Pending Sync" badge |
| **Settings** | Profile editor (name, email), change password, app info |

### Offline-First Architecture

```
┌────────────────────────────────────────────┐
│             Jetpack Compose UI             │
└────────────────────────────────────────────┘
      ▲  Flow (reads)       │  User actions
      │                     ▼
┌──────────────┐    ┌──────────────────────┐
│  Room DB     │◄───│  ParkingRepository   │
│ (local truth)│    │  + AuthRepository    │
└──────────────┘    └──────────────────────┘
                              │ Writes outbox
                              ▼
┌────────────────────────────────────────────┐
│          SyncWorker (WorkManager)          │
│         + ConnectivityObserver             │
└────────────────────────────────────────────┘
                              │ POSTs when online
                              ▼
┌────────────────────────────────────────────┐
│       Backend API (:3000/api/v1/...)       │
└────────────────────────────────────────────┘
```

- **Outbox Pattern**: Entry/exit writes happen locally first; `SyncWorker` delivers them to the backend when connectivity is available.
- **Idempotency**: Every action carries a client-generated UUID. Duplicate deliveries (retry after network drop) are safely deduplicated by the backend.
- **Dynamic Slot Totals**: `carTotal`, `scooterTotal`, `totalSlots` are returned by the availability endpoint and cached in Room — no hardcoded values.

### Room Database Entities (v2)

| Entity | Key Fields |
|---|---|
| `location_assignment` | id, name, code, city, lastUpdated |
| `slot_availability` | locationId, carVacant, carOccupied, scooterVacant, scooterOccupied, **carTotal, scooterTotal, totalSlots**, lastUpdated |
| `rate_master` | vehicleType, ratePerHour, effectiveFrom |
| `active_sessions` | id, vehicleNumber, vehicleType, slotCode, inTime, isPendingSync |
| `pending_actions` | id, actionType, payloadJson, status, retryCount |
| `receipts` | id, sessionId, amount, durationMinutes, isPendingConfirmation |

### Getting Started (Android)

#### Build
```bash
cd operator-app
.\gradlew.bat assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

#### Install on Device via ADB
```bash
# Forward backend port to device
adb reverse tcp:3000 tcp:3000

# Install APK
adb install app/build/outputs/apk/debug/app-debug.apk
```

#### Run Unit Tests
```bash
.\gradlew.bat testDebugUnitTest --no-daemon
```

#### Operator Account Setup

Administrators create operator accounts via the Admin Dashboard (Operator Management page). The admin sets the initial username and password. Operators can later change their password and update their profile from the **Settings** screen in the app.

---

## License

ISC
