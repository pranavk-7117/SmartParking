/**
 * Smart Parking — End-to-End API Smoke Test
 *
 * Prerequisites:
 *   1. Server running on http://localhost:3000 (npm run dev)
 *   2. Database migrated and seeded (npm run db:seed)
 *
 * Run: npm run test:api
 */

import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;
let token = '';
let locationId = '';
let sessionId = '';
let entryIdempotencyKey = '';
let exitIdempotencyKey = '';
const TEST_PLATE = `TST${Date.now().toString().slice(-6)}`;  // Unique plate per run

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function request(
  method: string,
  path: string,
  body?: object,
  auth = true
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// ── Test Suite ───────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Smart Parking API — End-to-End Smoke Test');
  console.log(`  Target: ${BASE_URL}`);
  console.log('══════════════════════════════════════════════════════\n');

  // ── 0. Health Check ─────────────────────────────────────────────────────
  console.log('0. Health Check');
  const health = await request('GET', '/health', undefined, false);
  assert('GET /health returns 200', health.status === 200);
  assert('status is ok', health.data?.status === 'ok');

  // ── 1. Login ─────────────────────────────────────────────────────────────
  console.log('\n1. POST /api/v1/auth/login');
  const login = await request('POST', '/api/v1/auth/login', { username: 'admin', password: 'Admin@12345' }, false);
  assert('returns 200', login.status === 200, `got ${login.status}`);
  assert('access_token present', !!login.data?.access_token);
  assert('operator_id present', !!login.data?.operator_id);
  token = login.data?.access_token ?? '';

  // ── 1b. Bad credentials → 401 ────────────────────────────────────────────
  const badLogin = await request('POST', '/api/v1/auth/login', { username: 'admin', password: 'wrong' }, false);
  assert('wrong password → 401', badLogin.status === 401);

  // ── 2. Assignment ─────────────────────────────────────────────────────────
  console.log('\n2. GET /api/v1/me/assignment');
  const assignment = await request('GET', '/api/v1/me/assignment');
  assert('returns 200', assignment.status === 200, `got ${assignment.status}: ${JSON.stringify(assignment.data)}`);
  assert('location_id present', !!assignment.data?.location_id);
  assert('location_name present', !!assignment.data?.location_name);
  locationId = assignment.data?.location_id ?? '';

  // ── 3. Rates ──────────────────────────────────────────────────────────────
  console.log('\n3. GET /api/v1/rates');
  const rates = await request('GET', '/api/v1/rates');
  assert('returns 200', rates.status === 200, `got ${rates.status}`);
  assert('array returned', Array.isArray(rates.data));
  assert('CAR rate present', rates.data?.some((r: any) => r.vehicle_type === 'CAR'));
  assert('SCOOTER rate present', rates.data?.some((r: any) => r.vehicle_type === 'SCOOTER'));

  // ── 4. Availability ───────────────────────────────────────────────────────
  console.log('\n4. GET /api/v1/locations/:id/availability');
  const avail = await request('GET', `/api/v1/locations/${locationId}/availability`);
  assert('returns 200', avail.status === 200, `got ${avail.status}: ${JSON.stringify(avail.data)}`);
  assert('car_vacant is number', typeof avail.data?.car_vacant === 'number');
  assert('scooter_vacant is number', typeof avail.data?.scooter_vacant === 'number');
  assert('total_vacant is sum', avail.data?.total_vacant === avail.data?.car_vacant + avail.data?.scooter_vacant);
  console.log(`     car_vacant=${avail.data?.car_vacant} scooter_vacant=${avail.data?.scooter_vacant}`);

  // ── 5. Vehicle Entry ──────────────────────────────────────────────────────
  console.log(`\n5. POST /api/v1/entries  (plate: ${TEST_PLATE})`);
  entryIdempotencyKey = crypto.randomUUID();
  const entry = await request('POST', '/api/v1/entries', {
    idempotency_key:  entryIdempotencyKey,
    location_id:      locationId,
    vehicle_number:   TEST_PLATE,
    vehicle_type:     'CAR',
    device_timestamp: new Date().toISOString(),
    captured_offline: false,
  });
  assert('returns 201', entry.status === 201, `got ${entry.status}: ${JSON.stringify(entry.data)}`);
  assert('session_id present', !!entry.data?.session_id);
  assert('slot_location_code present', !!entry.data?.slot_location_code);
  sessionId = entry.data?.session_id ?? '';
  console.log(`     session_id=${sessionId}  slot=${entry.data?.slot_location_code}`);

  // ── 6. Idempotent Entry Replay ────────────────────────────────────────────
  console.log('\n6. POST /api/v1/entries  (idempotent replay)');
  const entryReplay = await request('POST', '/api/v1/entries', {
    idempotency_key:  entryIdempotencyKey,
    location_id:      locationId,
    vehicle_number:   TEST_PLATE,
    vehicle_type:     'CAR',
    device_timestamp: new Date().toISOString(),
    captured_offline: false,
  });
  assert('returns 200 on replay', entryReplay.status === 200, `got ${entryReplay.status}`);
  assert('same session_id returned', entryReplay.data?.session_id === sessionId);

  // ── 7. Active Sessions ────────────────────────────────────────────────────
  console.log('\n7. GET /api/v1/sessions?status=ACTIVE&location_id=...');
  const sessions = await request('GET', `/api/v1/sessions?status=ACTIVE&location_id=${locationId}`);
  assert('returns 200', sessions.status === 200, `got ${sessions.status}`);
  assert('is array', Array.isArray(sessions.data));
  assert('test vehicle appears', sessions.data?.some((s: any) => s.vehicle_number === TEST_PLATE));

  // ── 8. Vehicle Exit ───────────────────────────────────────────────────────
  console.log('\n8. POST /api/v1/exits');
  exitIdempotencyKey = crypto.randomUUID();
  // Simulate 90-minute stay by using a past in_time via the session's inTime + 90 min
  const outTimestamp = new Date(Date.now() + 100).toISOString(); // slightly in future to clear constraint
  const exit = await request('POST', '/api/v1/exits', {
    idempotency_key:  exitIdempotencyKey,
    session_id:       sessionId,
    vehicle_number:   TEST_PLATE,
    device_timestamp: outTimestamp,
    captured_offline: false,
  });
  assert('returns 200', exit.status === 200, `got ${exit.status}: ${JSON.stringify(exit.data)}`);
  assert('bill_id present', !!exit.data?.bill_id);
  assert('amount > 0', (exit.data?.amount ?? 0) > 0);
  assert('duration_minutes >= 1', (exit.data?.duration_minutes ?? 0) >= 1);
  console.log(`     bill_id=${exit.data?.bill_id}  amount=₹${exit.data?.amount}  duration=${exit.data?.duration_minutes}min`);

  // ── 9. Idempotent Exit Replay ─────────────────────────────────────────────
  console.log('\n9. POST /api/v1/exits  (idempotent replay)');
  const exitReplay = await request('POST', '/api/v1/exits', {
    idempotency_key:  exitIdempotencyKey,
    session_id:       sessionId,
    vehicle_number:   TEST_PLATE,
    device_timestamp: outTimestamp,
    captured_offline: false,
  });
  assert('returns 200 on replay', exitReplay.status === 200, `got ${exitReplay.status}`);
  assert('same bill_id returned', exitReplay.data?.bill_id === exit.data?.bill_id);

  // ── 10. Availability Updated After Exit ───────────────────────────────────
  console.log('\n10. Availability updated after exit');
  const availAfter = await request('GET', `/api/v1/locations/${locationId}/availability`);
  assert('returns 200', availAfter.status === 200);
  assert('car_vacant restored', availAfter.data?.car_vacant >= avail.data?.car_vacant);

  // ── 11. Auth guard ────────────────────────────────────────────────────────
  console.log('\n11. Auth guard');
  const noToken = await request('GET', '/api/v1/rates', undefined, false);
  assert('unauthenticated request → 401', noToken.status === 401);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed / ${failed} failed`);
  console.log('══════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
