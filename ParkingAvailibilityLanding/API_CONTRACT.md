# AeroPark Smart Parking API Contract & Security Specification

This document defines the formal, strict API and security contract between the **Smart Parking Backend API**, the **Admin Web Application**, and the **Operator Android Application**.

---

## 1. Global Transport, Headers & Protocols

### 1.1 Client-Type Header (`X-Client-Type`)
Every call to `POST /api/v1/auth/login` **must** include this header to enforce administrative role segregation:
* **Admin Web App:** `X-Client-Type: admin-web`
* **Operator Android App:** `X-Client-Type: operator-android`

**Enforcement:**
* If header is missing or unrecognized $\rightarrow$ `400 Bad Request` (`{ "error": "Missing or invalid X-Client-Type header" }`).
* `X-Client-Type: admin-web` with Operator credentials $\rightarrow$ `403 Forbidden` (`{ "error": "Operator accounts must use the handheld operator app" }`).
* `X-Client-Type: operator-android` with Admin credentials $\rightarrow$ `403 Forbidden` (`{ "error": "Administrator accounts cannot log in to the handheld operator app" }`).

### 1.2 Authentication & Authorization Headers
All protected endpoints require:
```http
Authorization: Bearer <access_token>
```
* **Access Tokens:** Must carry claim `typ: "access"`.
* **Token Lifetime:** 2 hours for Admin; 12 hours for Operators.
* **Token Distinction:**
  * Standard access tokens have `typ: "access"`.
  * MFA pending tokens have `typ: "mfa_pending"` and are signed with a distinct audience (`aud: "aero-mfa-pending"`) or key.
  * The Foundation's `requireAuth` strictly rejects any token that is not `typ === "access"` with `401 Unauthorized`.
* **Server-side Revocation:** Checked on **every** request by comparing the JWT's `tokenVersion` claim with the user's database `tokenVersion` and verifying `status === 'Active'`. If mismatched, terminated, or token is revoked $\rightarrow$ `401 Unauthorized`.

---

## 2. Status Codes & Error Payloads

All error responses return a standardized JSON format:

```json
{
  "error": "Human-readable description of error",
  "code": "OPTIONAL_ERROR_CODE",
  "incidentId": "uuid-v4-for-500-errors",
  "retryAfter": 900
}
```

* **`400 Bad Request`:** Zod validation failure, malformed payload, missing `X-Client-Type`.
* **`401 Unauthorized`:** Token missing, expired, invalid `typ`, `tokenVersion` outdated, or user terminated. (Triggers immediate client logout).
* **`403 Forbidden`:** Role mismatch (Operator attempting Admin route), cross-site access attempt, or wrong client type.
* **`404 Not Found`:** Resource does not exist, or unassigned site on `/api/v1/display/:siteId`.
* **`405 Method Not Allowed`:** Returned on `DELETE /api/v1/sessions/:id` (voiding moved to `POST /api/v1/sessions/:id/void`).
* **`409 Conflict`:** Unique constraint conflict (e.g. duplicate vehicle entry plate with active session).
* **`429 Too Many Requests`:** Rate limit or login lockout exceeded. Returns `retryAfter` in seconds.
* **`500 Internal Server Error`:** In production, stack traces and raw SQL are stripped; returns `{ "error": "An unexpected internal error occurred", "incidentId": "<uuid>" }`.

---

## 3. Detailed Endpoint Contracts

### 3.1 Authentication & MFA

#### `POST /api/v1/auth/login`
* **Headers:** `X-Client-Type: admin-web | operator-android`
* **Request Body:**
  ```json
  {
    "username": "rajesh.admin",
    "password": "StrongPassword!123"
  }
  ```
* **Timing & Error Invariance:** Unknown usernames and incorrect passwords return identical errors (`{ "error": "Invalid username or password" }`) with constant-time dummy hash verification (comparing against a pre-computed dummy bcrypt hash) to prevent user enumeration.
* **Uniform Lockout:** Lockout counters (5 failures / 15 minutes per username+IP) and `429 Too Many Requests` apply to non-existent usernames identically to real users, preventing timing and state oracle enumeration.
* **Standard Success (`200 OK`):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6ImFjY2VzcyIs...",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6ImFjY2VzcyIs...",
    "operator_id": "u0000000-0000-0000-0000-000000000001",
    "mustChangePassword": false,
    "user": {
      "id": "u0000000-0000-0000-0000-000000000001",
      "username": "rajesh.admin",
      "name": "Rajesh Sharma",
      "role": "admin",
      "status": "Active",
      "locationId": null,
      "mustChangePassword": false
    }
  }
  ```
* **Forced First-Login Password Change (`200 OK` with flag):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token": "eyJhbGciOi...",
    "operator_id": "u0000000-0000-0000-0000-000000000002",
    "mustChangePassword": true,
    "user": {
      "id": "u0000000-0000-0000-0000-000000000002",
      "username": "suresh.operator",
      "name": "Suresh Patil",
      "role": "operator",
      "status": "Active",
      "locationId": "loc-uuid-1",
      "mustChangePassword": true
    }
  }
  ```
* **MFA Challenge Required (`200 OK`):**
  Returned if Admin has enabled TOTP MFA:
  ```json
  {
    "mfaRequired": true,
    "mfaPendingToken": "mfa_pending_eyJhbGciOi...",
    "expiresInSeconds": 300
  }
  ```
  *(Note: `mfaPendingToken` carries `typ: "mfa_pending"`. It is rejected by `requireAuth` on all API endpoints; it is valid solely for `POST /api/v1/auth/mfa/login`).*

#### `POST /api/v1/auth/mfa/login`
* **Request Body:**
  ```json
  {
    "mfaPendingToken": "mfa_pending_eyJhbGciOi...",
    "code": "123456" // Or 8-character recovery code
  }
  ```
* **Success (`200 OK`):** Returns the standard full `access_token` and `user` profile payload.

#### `POST /api/v1/auth/logout`
* **Headers:** `Authorization: Bearer <access_token>`
* **Action:** Bumps user's `tokenVersion` in database, instantly invalidating all issued tokens.
* **Success (`200 OK`):** `{ "success": true, "message": "Logged out successfully" }`.

---

### 3.2 Session Management & Voiding

#### `GET /api/v1/sessions`
* **Query Parameters:**
  * `limit`: Integer (Default: `50`, Max: `200`).
  * `offset`: Integer (Default: `0`).
  * `status`: Optional (`ACTIVE` | `COMPLETED` | `VOIDED`).
  * `location_id` / `siteId`: Optional.
* **Authorization Scope:**
  * **Admin:** Can query any site or facility-wide.
  * **Operator:** Forced to caller's assigned `locationId` (cross-site attempts return `403 Forbidden`).
* **Headers Returned:**
  * `X-Total-Count: 1240` (Exposed via `Access-Control-Expose-Headers`).
* **Body Returned:** Array of session objects `[...]` (100% backward-compatible).

#### `POST /api/v1/sessions/:id/void`
* **Access Level:** **Admin Only** (`requireAdmin`).
* **Request Body (Mandatory):**
  ```json
  {
    "reason": "Accidental double-scan at Gate 1"
  }
  ```
* **Success (`200 OK`):**
  ```json
  {
    "success": true,
    "sessionId": "s0000000-0000-0000-0000-000000000001",
    "status": "VOIDED",
    "voidReason": "Accidental double-scan at Gate 1",
    "voidedAt": "2026-10-11T14:15:00.000Z",
    "voidedBy": "rajesh.admin"
  }
  ```

#### `DELETE /api/v1/sessions/:id`
* **Returns:** `405 Method Not Allowed`:
  ```json
  {
    "error": "Direct session deletion is deprecated. Use POST /api/v1/sessions/:id/void"
  }
  ```

---

### 3.3 Vehicle Entries & Exits

#### `POST /api/v1/entries`
* **Access Level:** **Operator Only** (Scoped to assigned site).
* **Request Body:**
  ```json
  {
    "idempotency_key": "c7a6e19c-8512-4eb2-a1b7-b08e2f698d3e",
    "location_id": "loc-uuid-1",
    "vehicle_number": "KA01AB1234",
    "vehicle_type": "CAR",
    "slot_id": "slot-uuid-1",
    "device_timestamp": "2026-10-11T14:15:00.000Z",
    "captured_offline": false
  }
  ```
* **Validation & Security:**
  * `location_id` must match operator's assigned site (`403 Forbidden` if mismatched).
  * `device_timestamp` bounds: cannot be $> 5$ minutes in the future; cannot be $> 24$ hours in the past (`400 Bad Request`).
  * Slot auto-allocation is atomic within transaction with concurrency guard.
* **Success:** `201 Created` (or `200 OK` on idempotent replay).

#### `POST /api/v1/exits`
* **Access Level:** **Operator Only** (Scoped to assigned site).
* **Validation:** Session being closed must belong to operator's assigned site. Same timestamp bounds apply.

---

### 3.4 Public Kiosk Display

Both public display endpoints include each active site's address, coordinates, current hourly rates, and an `availableSpots` array containing only vacant slots. `GET /api/v1/display` returns the primary site's availability and an `allSites` array with the same per-site fields.

#### `GET /api/v1/display/:siteId`
* **Access Level:** **Public** (Unauthenticated).
* **Rate Limit:** 120 requests/minute per IP (allows multiple physical kiosks polling every 5s behind a single NAT gateway).
* **Success (`200 OK`):**
  ```json
  {
    "siteId": "site-hadapsar",
    "siteName": "AeroPark – Hadapsar",
    "address": "AeroPark, Hadapsar, Pune",
    "latitude": 18.5089,
    "longitude": 73.926,
    "carHourlyRate": 30,
    "scooterHourlyRate": 15,
    "availableSpots": [
      { "locationCode": "C-01", "category": "Car" },
      { "locationCode": "S-02", "category": "Scooter" }
    ],
    "carAvailable": 35,
    "carTotal": 40,
    "scooterAvailable": 18,
    "scooterTotal": 20,
    "totalAvailable": 53,
    "totalSlots": 60,
    "isFacilityFull": false,
    "updatedAt": "2026-10-11T14:15:00.000Z"
  }
  ```
* **Site Not Found (`404 Not Found` - Silent fallback removed):**
  ```json
  {
    "error": "Parking site not found or inactive",
    "siteId": "invalid-site-id"
  }
  ```

---

### 3.5 APK Distribution

#### `GET /distribution/:secretPath`
* **Path:** Defined via `process.env.APK_DOWNLOAD_SECRET_PATH` (e.g. `/distribution/d9f8e7a6b5c4123-operator.apk`).
* **Rate Limit:** 10 requests/hour per IP.
* **Behavior:** Validates file existence; returns APK binary with `Content-Disposition: attachment`. If invalid slug or file missing $\rightarrow$ `404 Not Found`. Old `/download/operator-app.apk` is removed.
