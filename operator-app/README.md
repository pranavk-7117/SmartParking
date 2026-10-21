# Smart Parking Operator App — Native Android

A native Android operator application for the **Smart Parking Management System**, engineered with a strict **offline-first architecture**, client-side outbox pattern, on-device ML Kit license plate OCR, and deterministic WorkManager background synchronization.

---

## 1. Tech Stack (Non-Negotiable)

- **Language**: Kotlin 2.0+ (JVM 17 target)
- **UI Framework**: Jetpack Compose with Material 3
- **Camera Pipeline**: CameraX (`camera-core`, `camera-camera2`, `camera-lifecycle`, `camera-view`)
- **Plate Text Recognition**: Google ML Kit Text Recognition (`play-services-mlkit-text-recognition`, Latin on-device model — **100% offline, zero network requests**)
- **Local Persistence / Offline Cache**: Room Database 2.6+ (`room-runtime`, `room-ktx`, `ksp`)
- **Background Synchronization**: AndroidX WorkManager (`work-runtime-ktx`)
- **HTTP Networking**: Retrofit 2 + OkHttp 4 + Gson Converter
- **Secure Storage**: `EncryptedSharedPreferences` via AndroidX Security Crypto (AES-256 GCM)
- **OS Compatibility**: Min SDK 26 (Android 8.0+), Compile SDK 36, Target SDK 36 (supporting current major Android versions)

---

## 2. Design System Alignment

Matches the companion Smart Parking Admin Dashboard:
- **Background**: `#FFFFFF` (pure white)
- **Surface**: `#F8FAFC` (card panels, item containers)
- **Primary Accent**: `#2563EB` (used strictly for primary actions, minimum 48×48dp touch targets)
- **Text Primary**: `#111827` | **Text Secondary**: `#6B7280`
- **Border / Divider**: `#E5E7EB` (1dp continuous borders)
- **Semantic Badges**:
  - Success: `#15803D` (text/icon) on `#DCFCE7` (bg)
  - Warning / Full: `#B45309` on `#FEF3C7`
  - Error: `#B91C1C` on `#FEE2E2`
  - Pending: `#D97706` on `#FEF3C7`
- **Rule of Visual Feedback**: Every status (Vacant/Occupied, Synced/Pending, Active/Completed) is explicitly paired with an icon and text label — **never represented by color alone**.

---

## 3. The Five Core Screens

1. **Login Screen (`LoginScreen.kt`)**:
   - Username and password input only. No client-side role picker (role returned by server or loaded from secure cache).
   - Offline fallback: Allows login using cached credentials when the device is disconnected.
2. **Home Screen (`HomeScreen.kt`)**:
   - Displays assigned location name (`location_assignment` table in Room), live or cached Car/Scooter/Total availability counts.
   - Visible "as of [time]" / "Offline — showing cached data" indicator.
   - If no facility assignment is cached or resolved, displays an explicit informative state card.
   - Two large touch targets (minimum 52dp height): **New Vehicle Entry** and **Process Vehicle Exit**.
3. **Capture Entry Screen (`CaptureEntryScreen.kt`)**:
   - Full-screen CameraX viewfinder with visual alignment box.
   - On-device plate extraction using regex pattern filtering (`[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}`).
   - Operator review step: OCR result populates an **editable text field** (never auto-submitted without confirmation).
   - Category selector (two large cards: **Car** / **Scooter**).
   - "Confirm Entry" action writes immediately to Room and queues for sync.
4. **Capture Exit Screen (`CaptureExitScreen.kt`)**:
   - Scan or manual lookup of license plate matched against locally cached active sessions.
   - Review session details (category, slot allocated, entry timestamp).
   - "Compute Bill & Complete Exit" triggers tariff calculation (ceiling hour pricing) and renders the **Receipt Screen**.
   - Offline receipts display a prominent **"Pending Server Confirmation"** badge.
5. **Active Sessions Screen (`ActiveSessionsScreen.kt`)**:
   - Real-time list of parked vehicles today, streamed directly from Room via Kotlin Flow.
   - Unsynced entries display a prominent **"Pending Sync"** badge (`HourglassEmpty` icon).
   - Tapping any item deep-links directly into the Exit flow for that session ID.

---

## 4. Offline-First Architecture & Outbox Pattern

### Room as the Single Source of Truth
```
┌────────────────────────────────────────────────────────┐
│                   Jetpack Compose UI                   │
└────────────────────────────────────────────────────────┘
          ▲                                  │
     Flow │ (Reads only)        User Actions │ (confirmEntry/Exit)
          │                                  ▼
┌──────────────────┐               ┌──────────────────┐
│   Room Database  │               │ ParkingRepository│
│ (Local Entities) │               └──────────────────┘
└──────────────────┘                         │
          ▲                                  │ Inserts into Outbox
          │ Updates Cache                    ▼
┌────────────────────────────────────────────────────────┐
│                      SyncWorker                        │
│          (WorkManager + Exponential Backoff)           │
└────────────────────────────────────────────────────────┘
          │                                  ▲
   POSTed │ to Central Backend               │ Network Restored
          ▼                                  │
┌────────────────────────────────────────────────────────┐
│             Backend API (/api/v1/entries, exits)       │
└────────────────────────────────────────────────────────┘
```

1. **Reactive UI**: The UI observes Room tables via `Flow`. The network layer never writes directly to UI state.
2. **Outbox Pattern**:
   - When an entry or exit is confirmed, a record is written immediately into the `pending_actions` table.
   - The local `active_sessions` or `receipts` table is updated simultaneously, providing instant UI feedback.
   - Local slot availability count is adjusted immediately using atomic delta queries.
3. **Guaranteed Delivery**:
   - `SyncWorker` runs whenever network connectivity is verified (`NetworkType.CONNECTED`).
   - If an API call fails (network dropout, timeout), WorkManager retries with **exponential backoff** (initial 10s delay).
   - `ConnectivityObserver` uses `ConnectivityManager.NetworkCallback` to trigger an immediate sync upon network restoration without waiting for periodic polling.

---

## 5. Client-Generated UUID Idempotency Key

To make retries completely safe across intermittent underground connections:

- Every entry and exit generates a client-side RFC 4122 UUID (`idempotencyKey = UUID.randomUUID().toString()`).
- For entries, the `idempotency_key` is transmitted to the backend and becomes the permanent `session_id`.
- If a network failure occurs after the backend processed the request, WorkManager's automatic retry will replay the identical `idempotency_key`.
- **Backend Contract**: The central API guarantees that receiving a duplicate `idempotency_key` returns HTTP `200 OK` with the existing session/bill, preventing duplicate gate entries or multiple billings.

---

## 6. Dual Timestamp Strategy (Offline Capture vs Server Clock)

Under normal operating conditions, central servers act as authoritative timekeepers to prevent clock tampering. In an offline-first deployment, the device must record the event locally at the exact moment of occurrence:

1. **Capture Offline**:
   - The app records the device system clock (`device_timestamp = ISO 8601 UTC`) and sets `captured_offline = true`.
2. **Transmission**:
   - Both the device timestamp and the offline flag are sent in the request payload (`EntryRequestDto` / `ExitRequestDto`).
   - The backend records both the device's event time and the server receipt time for deterministic auditing.
3. **Operator Notification**:
   - When a receipt is generated offline, `ReceiptEntity.isPendingConfirmation` is flagged `true`.
   - The receipt displays **"Pending Server Confirmation"** until the backend sync succeeds and confirms the duration and amount.

---

## 7. Room Database Schema

### Entities:
- `location_assignment`: ID, name, code, city, lastUpdated.
- `slot_availability`: locationId, carVacant, carOccupied, scooterVacant, scooterOccupied, totalVacant, totalOccupied, lastUpdated.
- `rate_master`: vehicleType (`CAR`, `SCOOTER`), ratePerHour, effectiveFrom.
- `active_sessions`: id, locationId, vehicleId, vehicleNumber, vehicleType, slotId, slotCode, inTime, inTimeIso, isPendingSync, idempotencyKey.
- `pending_actions`: id (UUID), actionType (`ENTRY`/`EXIT`), payloadJson, status (`PENDING`, `SYNCED`, `FAILED`), capturedOffline, deviceTimestamp, createdAt, retryCount, lastErrorMessage.
- `receipts`: id, sessionId, vehicleNumber, inTime, outTime, durationMinutes, ratePerHour, amount, operatorId, generatedOn, isPendingConfirmation.

---

## 8. Verification & Test Runbook

### Running Unit Tests
```bash
cd operator-app
.\gradlew.bat testDebugUnitTest --no-daemon
```
Verifies:
- UUID validity and ISO-8601 UTC timestamp serialization/deserialization.
- ML Kit regex text extraction for Indian vehicle plate formats (`KA-01-AB-1234`, `MH-12-CD-5678`, `DL-04-EF-9012`).

### Running the App Build
```bash
.\gradlew.bat assembleDebug
```
Produces: `app/build/outputs/apk/debug/app-debug.apk`.

### Offline-to-Online Operational Verification
1. **Offline Login**:
   - Place device in Airplane Mode. Log in with a previously authenticated operator account.
   - Home screen displays cached facility name and slot counts with the orange "Offline Mode" banner.
2. **Offline Entry**:
   - Capture or enter plate `KA05XY9999`, choose `CAR`, click **Confirm Entry**.
   - Active Sessions immediately displays the car with a **Pending Sync** badge.
   - Slot availability decrements immediately in local Room cache.
3. **Offline Exit**:
   - Search or select `KA05XY9999` in Process Exit.
   - Bill is computed instantly from cached rates; receipt displays **Pending Server Confirmation**.
4. **Reconnection & Idempotent Sync**:
   - Disable Airplane Mode.
   - `ConnectivityObserver` detects `NET_CAPABILITY_VALIDATED` and kicks off `SyncWorker.scheduleImmediateSync()`.
   - The entry and exit payloads are delivered to `http://<host>:3000/api/v1/entries` and `exits`.
   - The pending action records are cleared from Room outbox, and the receipt flips to **Server Confirmed**.
   - Backend database confirms exactly **one session** and **one bill** created.
