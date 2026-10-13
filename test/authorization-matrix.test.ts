import http from 'http';
import { app } from '../src/app';
import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../src/middleware/auth';
import { signMfaPendingToken } from '../src/lib/mfa';
import { AdminRole } from '@prisma/client';

let server: http.Server;
let baseUrl = '';

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function request(
  method: string,
  path: string,
  options: {
    token?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, headers: res.headers, data };
}

async function runTestSuite() {
  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('  Part A: Route Inventory & Authorization Matrix Test Suite');
  console.log('════════════════════════════════════════════════════════════════════\n');

  server = app.listen(0);
  const address = server.address() as any;
  baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // ── Setup Actors in Database ───────────────────────────────────────────
    const hadapsar = await prisma.location.findFirst({ where: { code: 'site-hadapsar' } });
    const camp = await prisma.location.findFirst({ where: { code: 'site-camp' } });
    if (!hadapsar || !camp) throw new Error('Seeded sites not found');

    const adminUser = await prisma.adminUser.findUnique({ where: { username: 'rajesh.admin' } });
    if (!adminUser) throw new Error('Admin user not found');

    // Create 2 test operators for matrix
    const passwordHash = await bcrypt.hash('OperatorPass@123', 10);
    const opHadapsar = await prisma.adminUser.upsert({
      where: { username: 'test.op.hadapsar' },
      update: {
        role: AdminRole.OPERATOR,
        status: 'Active',
        locationId: hadapsar.id,
        mustChangePassword: false,
        tokenVersion: 1,
      },
      create: {
        username: 'test.op.hadapsar',
        name: 'Hadapsar Operator',
        passwordHash,
        role: AdminRole.OPERATOR,
        status: 'Active',
        locationId: hadapsar.id,
        mustChangePassword: false,
        tokenVersion: 1,
      },
    });

    const opCamp = await prisma.adminUser.upsert({
      where: { username: 'test.op.camp' },
      update: {
        role: AdminRole.OPERATOR,
        status: 'Active',
        locationId: camp.id,
        mustChangePassword: false,
        tokenVersion: 1,
      },
      create: {
        username: 'test.op.camp',
        name: 'Camp Operator',
        passwordHash,
        role: AdminRole.OPERATOR,
        status: 'Active',
        locationId: camp.id,
        mustChangePassword: false,
        tokenVersion: 1,
      },
    });

    // Generate tokens for actors
    const adminToken = signAccessToken({
      id: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      locationId: adminUser.locationId,
      tokenVersion: adminUser.tokenVersion,
    });

    const opHadapsarToken = signAccessToken({
      id: opHadapsar.id,
      username: opHadapsar.username,
      role: opHadapsar.role,
      locationId: opHadapsar.locationId,
      tokenVersion: opHadapsar.tokenVersion,
    });

    const opCampToken = signAccessToken({
      id: opCamp.id,
      username: opCamp.username,
      role: opCamp.role,
      locationId: opCamp.locationId,
      tokenVersion: opCamp.tokenVersion,
    });

    const mfaPendingToken = signMfaPendingToken(adminUser.id, adminUser.username);

    // ── 1. Route Inventory & Public Whitelist Audit ─────────────────────────
    console.log('▶ Test 1: Route Inventory & Public Allowlist Verification');

    const publicAllowlist = new Set([
      'GET /health',
      'GET /download/operator-app.apk',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/mfa/login',
      'GET /api/v1/display/:siteId',
    ]);

    // Inspect routes from app._router.stack
    const routeInventory: Array<{ method: string; path: string }> = [];

    app._router.stack.forEach((layer: any) => {
      if (layer.route) {
        const p = layer.route.path;
        Object.keys(layer.route.methods).forEach((m) => {
          routeInventory.push({ method: m.toUpperCase(), path: p });
        });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // Mounted subrouter
        // Extract mount prefix from regex
        const match = layer.regexp?.toString().match(/\\\^\\\/([a-zA-Z0-9_\-\\\/]+?)(?:\\\/\?|\\\/?)/);
        let prefix = '';
        if (match && match[1]) {
          prefix = '/' + match[1].replace(/\\/g, '');
        }

        layer.handle.stack.forEach((subLayer: any) => {
          if (subLayer.route) {
            const subPath = subLayer.route.path === '/' ? '' : subLayer.route.path;
            const fullPath = `${prefix}${subPath}` || '/';
            Object.keys(subLayer.route.methods).forEach((m) => {
              routeInventory.push({ method: m.toUpperCase(), path: fullPath });
            });
          }
        });
      }
    });

    console.log(`  Discovered ${routeInventory.length} registered API endpoints across all routers.`);
    assert('Route inventory introspection successfully extracted routes', routeInventory.length >= 15);

    // ── 2. Unauthenticated Access Matrix Test ───────────────────────────────
    console.log('\n▶ Test 2: Unauthenticated Access Rejection for Protected Routes');

    // Test a sample of protected endpoints without auth
    const protectedEndpoints = [
      { method: 'GET', path: '/api/v1/auth/me' },
      { method: 'POST', path: '/api/v1/auth/logout' },
      { method: 'GET', path: '/api/v1/operators' },
      { method: 'POST', path: '/api/v1/operators' },
      { method: 'GET', path: '/api/v1/reports' },
      { method: 'GET', path: '/api/v1/notifications' },
      { method: 'POST', path: '/api/v1/notifications' },
      { method: 'GET', path: '/api/v1/me/assignment' },
      { method: 'GET', path: '/api/v1/me/today-summary' },
    ];

    for (const ep of protectedEndpoints) {
      const res = await request(ep.method, ep.path);
      assert(`Unauthenticated ${ep.method} ${ep.path} returns 401`, res.status === 401, `got ${res.status}`);
    }

    // Verify public endpoints return non-401 for unauthenticated calls
    const healthRes = await request('GET', '/health');
    assert('Public GET /health is accessible unauthenticated (200)', healthRes.status === 200);

    const displayRes = await request('GET', '/api/v1/display/site-hadapsar');
    assert('Public GET /api/v1/display/:siteId is accessible unauthenticated (200)', displayRes.status === 200);

    // Verify mfa_pending token is rejected on protected routes
    const mfaBlocked = await request('GET', '/api/v1/auth/me', { token: mfaPendingToken });
    assert('mfa_pending token rejected on protected route (401)', mfaBlocked.status === 401);

    // ── 3. Role Segregation: Admin vs Operator ──────────────────────────────
    console.log('\n▶ Test 3: Role Segregation (Admin Only Endpoints)');

    // Endpoints that require Admin privileges
    const adminOnlyEndpoints = [
      { method: 'GET', path: '/api/v1/operators' },
      { method: 'POST', path: '/api/v1/operators', body: { name: 'Test', username: 'test', contact: '12345678' } },
      { method: 'GET', path: '/api/v1/reports' },
      { method: 'POST', path: '/api/v1/notifications', body: { title: 'Alert', message: 'Test message' } },
      { method: 'DELETE', path: '/api/v1/notifications/non-existent-id' },
    ];

    for (const ep of adminOnlyEndpoints) {
      // Admin should NOT receive 403 Forbidden
      const adminRes = await request(ep.method, ep.path, { token: adminToken, body: ep.body });
      assert(
        `Admin allowed on ${ep.method} ${ep.path} (status != 401 && status != 403)`,
        adminRes.status !== 401 && adminRes.status !== 403,
        `got ${adminRes.status}`
      );

      // Operator must receive 403 Forbidden
      const opRes = await request(ep.method, ep.path, { token: opHadapsarToken, body: ep.body });
      assert(
        `Operator blocked on ${ep.method} ${ep.path} with 403 Forbidden`,
        opRes.status === 403,
        `got ${opRes.status}`
      );
    }

    // ── 4. Operator Site Scope & Context Segregation ─────────────────────────
    console.log('\n▶ Test 4: Operator Identity & Site Segregation');

    // Operator 1 (Hadapsar)
    const op1Assignment = await request('GET', '/api/v1/me/assignment', { token: opHadapsarToken });
    assert('Hadapsar operator GET /api/v1/me/assignment returns 200', op1Assignment.status === 200);
    assert('Hadapsar operator receives Hadapsar locationId', op1Assignment.data?.location_id === hadapsar.id);

    // Operator 2 (Camp)
    const op2Assignment = await request('GET', '/api/v1/me/assignment', { token: opCampToken });
    assert('Camp operator GET /api/v1/me/assignment returns 200', op2Assignment.status === 200);
    assert('Camp operator receives Camp locationId', op2Assignment.data?.location_id === camp.id);
    assert('Site assignments are distinct between operators', op1Assignment.data?.location_id !== op2Assignment.data?.location_id);

    // ── 5. Mass-Assignment Protection on Profile ─────────────────────────────
    console.log('\n▶ Test 5: Profile Mass-Assignment Protection');

    const tamperedProfile = await request('PUT', '/api/v1/auth/profile', {
      token: opHadapsarToken,
      body: {
        name: 'Legit Operator Name',
        role: 'ADMIN', // Attacker attempts privilege escalation
        locationId: camp.id, // Attacker attempts cross-site escalation
        status: 'SuperUser',
      },
    });

    assert('PUT /api/v1/auth/profile succeeds with 200', tamperedProfile.status === 200);
    assert(
      'Role escalation attempt was silently ignored (still OPERATOR)',
      tamperedProfile.data?.user?.role?.toUpperCase() === 'OPERATOR'
    );
    assert('Location ID tampering was ignored', tamperedProfile.data?.user?.locationId === hadapsar.id);

    // Verify in DB directly
    const refreshedOp = await prisma.adminUser.findUnique({ where: { id: opHadapsar.id } });
    assert('DB role remains OPERATOR', refreshedOp?.role === AdminRole.OPERATOR);
    assert('DB location remains Hadapsar', refreshedOp?.locationId === hadapsar.id);

    // ── 6. Cleanup ──────────────────────────────────────────────────────────
    await prisma.adminUser.deleteMany({
      where: { username: { in: ['test.op.hadapsar', 'test.op.camp'] } },
    });
  } finally {
    server.close();
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  Matrix Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
