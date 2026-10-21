# API Contract Addendum: Offline-Sync & Dual Timestamps

This addendum defines the formal contract between the **Smart Parking Backend API** and the **Android Operator App** for offline-first synchronization, idempotency, and dual timestamp tracking.

---

## 1. Overview & Rationale

In offline operations (e.g. network outage or underground parking bays), the operator device cannot query the central server clock or immediately commit records to the central database.
To maintain high reliability, data integrity, and deterministic auditing:
1. **Client-Generated Idempotency Key**: Every entry and exit generates a client UUID at creation time. Retries and re-syncs will never create duplicate sessions or double-charge a vehicle.
2. **Dual Timestamping**: Offline captures record the client device's local timestamp and set `captured_offline = true`. When synchronization occurs, both timestamps are transmitted, allowing backend auditing and rate calculation policies to distinguish real-time gate events from queued offline syncs.

---

## 2. Endpoints Specification

### 2.1 Vehicle Entry
- **Endpoint**: `POST /api/v1/entries`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`

#### Request Body
```json
{
  "idempotency_key": "c7a6e19c-8512-4eb2-a1b7-b08e2f698d3e",
  "location_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "vehicle_number": "KA01AB1234",
  "vehicle_type": "CAR",
  "slot_id": "00000000-0000-0000-0000-000000000001",
  "device_timestamp": "2026-09-15T15:30:00.000Z",
  "captured_offline": true
}
```

#### Field Definitions
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `idempotency_key` | `UUID` (string) | **Yes** | Client-generated UUID ensuring retry safety. Backend must guarantee that duplicate requests with the same `idempotency_key` return the original session without creating a new row. |
| `location_id` | `UUID` (string) | **Yes** | Identifier of the parking facility / location. |
| `vehicle_number` | `String` | **Yes** | License plate number (alphanumeric, uppercase, no spaces/hyphens). |
| `vehicle_type` | `String` | **Yes** | `CAR` or `SCOOTER`. |
| `slot_id` | `UUID` (string) | No | Optional assigned slot ID. If omitted, backend allocates an available vacant slot. |
| `device_timestamp` | `ISO 8601 String` | **Yes** | Local device timestamp at the moment the operator confirmed entry. |
| `captured_offline` | `Boolean` | **Yes** | `true` if captured while the app had no network connectivity; `false` if online. |

#### Success Response (`201 Created` or `200 OK` for idempotent replay)
```json
{
  "session_id": "00000000-0000-0000-0000-000000000001",
  "vehicle_id": "e0000000-0000-0000-0000-000000000001",
  "vehicle_number": "KA01AB1234",
  "vehicle_type": "CAR",
  "slot_id": "00000000-0000-0000-0000-000000000001",
  "slot_location_code": "C-01",
  "in_time": "2026-09-15T15:30:00.000Z",
  "status": "ACTIVE",
  "captured_offline": true
}
```

---

### 2.2 Vehicle Exit
- **Endpoint**: `POST /api/v1/exits`
- **Headers**:
  - `Authorization: Bearer <jwt_token>`
  - `Content-Type: application/json`

#### Request Body
```json
{
  "idempotency_key": "d8b7f28d-9623-4fc3-b2c8-c19f3f709e4f",
  "session_id": "00000000-0000-0000-0000-000000000001",
  "vehicle_number": "KA01AB1234",
  "device_timestamp": "2026-09-15T17:30:00.000Z",
  "captured_offline": true
}
```

#### Field Definitions
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `idempotency_key` | `UUID` (string) | **Yes** | Client-generated UUID ensuring retry safety. |
| `session_id` | `UUID` (string) | **Yes** | ID of the active parking session to close. |
| `vehicle_number` | `String` | **Yes** | Vehicle registration number. |
| `device_timestamp` | `ISO 8601 String` | **Yes** | Local device timestamp at checkout. |
| `captured_offline` | `Boolean` | **Yes** | `true` if closed offline; `false` if closed online. |

#### Success Response (`200 OK`)
```json
{
  "bill_id": "f0000000-0000-0000-0000-000000000001",
  "session_id": "00000000-0000-0000-0000-000000000001",
  "vehicle_number": "KA01AB1234",
  "in_time": "2026-09-15T15:30:00.000Z",
  "out_time": "2026-09-15T17:30:00.000Z",
  "duration_minutes": 120,
  "rate_applied": 40.00,
  "amount": 80.00,
  "generated_on": "2026-09-15T17:30:00.000Z",
  "operator_id": "u0000000-0000-0000-0000-000000000001"
}
```

---

### 2.3 Other Endpoints Aligned with Documentation
- **`POST /api/v1/auth/login`**: Authenticate operator (`username`, `password`) -> returns JWT `access_token`, `operator` details (`id`, `name`, `role`).
- **`GET /api/v1/me/assignment`**: Returns operator's assigned location for today (`id`, `name`, `code`, `city`).
- **`GET /api/v1/locations/{id}/availability`**: Returns live/cached slot counts (`car_vacant`, `car_occupied`, `scooter_vacant`, `scooter_occupied`, `total_vacant`, `total_occupied`).
- **`GET /api/v1/sessions?status=ACTIVE&location_id={id}`**: Returns array of currently parked vehicles and session details at the assigned location.
- **`GET /api/v1/rates`**: Returns hourly rate definitions for `CAR` and `SCOOTER`.
