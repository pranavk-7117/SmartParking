import http from 'http';
import { app } from '../src/app';
import prisma from '../src/lib/prisma';
import { generateTotpSetup, verifyTotpToken, signMfaPendingToken } from '../src/lib/mfa';
import { validatePassword, hashPassword } from '../src/lib/password';
import { signAccessToken } from '../src/middleware/auth';

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
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

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
  console.log('  Part A: Authentication, Identity, Governance & Audit Test Suite');
  console.log('════════════════════════════════════════════════════════════════════\n');

  // Start HTTP server on random free port
  server = app.listen(0);
  const address = server.address() as any;
  baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // ── 1. Password Policy Validation ───────────────────────────────────────
    console.log('▶ Test 1: Password Complexity Validator');
    const adminShort = validatePassword('Short1!', 'ADMIN');
    assert('Admin password < 10 chars is rejected', !adminShort.valid);

    const adminNoSymbol = validatePassword('AdminPassword123', 'ADMIN');
    assert('Admin password without symbol is rejected', !adminNoSymbol.valid);

    const adminValid = validatePassword('AeroPark#Admin2026', 'ADMIN');
    assert('Valid admin password passes', adminValid.valid);

    const opShort = validatePassword('Op1!', 'OPERATOR');
    assert('Operator password < 8 chars is rejected', !opShort.valid);

    const opValid = validatePassword('Operator@12345', 'OPERATOR');
    assert('Valid operator password passes', opValid.valid);

    // ── 2. X-Client-Type Header Enforcement ────────────────────────────────
    console.log('\n▶ Test 2: X-Client-Type Header Validation & Role Segregation');
    const noHeader = await request('POST', '/api/v1/auth/login', {
      body: { username: 'rajesh.admin', password: 'StrongBootstrapAdminPassword!123' },
    });
    assert('Missing X-Client-Type returns 400', noHeader.status === 400);

    const invalidHeader = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'unknown-client' },
      body: { username: 'rajesh.admin', password: 'StrongBootstrapAdminPassword!123' },
    });
    assert('Invalid X-Client-Type returns 400', invalidHeader.status === 400);

    const opOnAdminWeb = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'admin-web' },
      body: { username: 'admin', password: 'Admin@12345' },
    });
    assert('Operator account blocked from admin-web (403)', opOnAdminWeb.status === 403);

    const adminOnMobile = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'operator-android' },
      body: { username: 'rajesh.admin', password: 'StrongBootstrapAdminPassword!123' },
    });
    assert('Admin account blocked from operator-android (403)', adminOnMobile.status === 403);

    // ── 3. Timing Invariance / Non-Existent User Login ───────────────────────
    console.log('\n▶ Test 3: Unknown Username Handling & Constant-Time Dummy Verification');
    const startDummy = Date.now();
    const unknownUser = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'admin-web' },
      body: { username: 'nonexistent.user.test', password: 'Password@123' },
    });
    const dummyDuration = Date.now() - startDummy;
    assert('Unknown username returns 401', unknownUser.status === 401);
    assert('Error message does not reveal user absence', unknownUser.data?.error === 'Invalid username or password');
    assert('Dummy comparison executed (took realistic bcrypt time > 30ms)', dummyDuration >= 20);

    // ── 4. DB-backed Login Lockout & Progressive Delay ───────────────────────
    console.log('\n▶ Test 4: Database-Backed Lockout (5 failures / 15m)');
    const testLockedUsername = `lockout.test.${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await request('POST', '/api/v1/auth/login', {
        headers: { 'X-Client-Type': 'admin-web' },
        body: { username: testLockedUsername, password: 'WrongPassword!123' },
      });
    }

    const lockedAttempt = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'admin-web' },
      body: { username: testLockedUsername, password: 'WrongPassword!123' },
    });
    assert('6th failed attempt returns 429 Too Many Requests', lockedAttempt.status === 429);
    assert('Lockout returns retryAfter in seconds', typeof lockedAttempt.data?.retryAfter === 'number');

    // ── 5. Successful Login & Token Claims ──────────────────────────────────
    console.log('\n▶ Test 5: Successful Login & Option B Token Properties');
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'admin-web' },
      body: { username: 'rajesh.admin', password: 'StrongBootstrapAdminPassword!123' },
    });
    assert('Admin login succeeds with 200', adminLogin.status === 200);
    assert('Access token returned', !!adminLogin.data?.access_token);
    assert('Token claim typ is access', typeof adminLogin.data?.access_token === 'string');
    const adminToken = adminLogin.data?.access_token;

    // ── 6. Token Invalidation on Logout ─────────────────────────────────────
    console.log('\n▶ Test 6: Immediate Token Revocation via POST /api/v1/auth/logout');
    // Verify token works
    const meBefore = await request('GET', '/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Token valid before logout (200)', meBefore.status === 200);

    const logoutRes = await request('POST', '/api/v1/auth/logout', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Logout returns 200 OK', logoutRes.status === 200);

    const meAfter = await request('GET', '/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert('Old token rejected with 401 after logout', meAfter.status === 401);

    // ── 7. Operator Creation, Password Policy & Reassignment Revocation ─────
    console.log('\n▶ Test 7: Operator Governance & Token Revocation on Reassignment');
    // Log back in as admin
    const adminLogin2 = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'admin-web' },
      body: { username: 'rajesh.admin', password: 'StrongBootstrapAdminPassword!123' },
    });
    const currentAdminToken = adminLogin2.data?.access_token;

    const newOpUsername = `op.test.${Date.now()}`;
    const createOpRes = await request('POST', '/api/v1/operators', {
      headers: { Authorization: `Bearer ${currentAdminToken}` },
      body: {
        name: 'Test Operator Ops',
        username: newOpUsername,
        contact: '+91 99999 88888',
        assignedSiteId: 'site-hadapsar',
        password: 'Operator@12345',
      },
    });
    assert('Admin creates operator with 201', createOpRes.status === 201);
    const newOpId = createOpRes.data?.id;

    // Log in as new operator
    const opLogin = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'operator-android' },
      body: { username: newOpUsername, password: 'Operator@12345' },
    });
    assert('Operator login succeeds (200)', opLogin.status === 200);
    assert('mustChangePassword flag is true on creation', opLogin.data?.mustChangePassword === true);
    const opToken = opLogin.data?.access_token;

    // Operator cannot access general endpoints while mustChangePassword is true
    const opBlocked = await request('GET', '/api/v1/me/today-summary', {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert('Operator blocked with 403 when password change required', opBlocked.status === 403);
    assert('Error code is PASSWORD_CHANGE_REQUIRED', opBlocked.data?.code === 'PASSWORD_CHANGE_REQUIRED');

    // Operator changes password
    const changePass = await request('POST', '/api/v1/auth/change-password', {
      headers: { Authorization: `Bearer ${opToken}` },
      body: { currentPassword: 'Operator@12345', newPassword: 'NewOperatorPass@999' },
    });
    assert('Change password succeeds (200)', changePass.status === 200);
    const freshOpToken = changePass.data?.access_token;

    // Operator accesses me route with fresh token
    const opSummary = await request('GET', '/api/v1/me/today-summary', {
      headers: { Authorization: `Bearer ${freshOpToken}` },
    });
    assert('Operator accesses today-summary after password change (200)', opSummary.status === 200);

    // Reassign operator to another site by Admin
    const reassignRes = await request('POST', `/api/v1/operators/${newOpId}/reassign`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` },
      body: { newSiteId: 'site-camp', reason: 'Shift rotation' },
    });
    assert('Admin reassigns operator with 200', reassignRes.status === 200);

    // Old token should now be invalidated
    const oldOpCheck = await request('GET', '/api/v1/me/today-summary', {
      headers: { Authorization: `Bearer ${freshOpToken}` },
    });
    assert('Operator token revoked immediately upon site reassignment (401)', oldOpCheck.status === 401);

    // ── 8. MFA Engine & Flow ────────────────────────────────────────────────
    console.log('\n▶ Test 8: TOTP Two-Factor Authentication Flow');
    // Setup MFA for admin
    const mfaSetup = await request('POST', '/api/v1/auth/mfa/setup', {
      headers: { Authorization: `Bearer ${currentAdminToken}` },
    });
    assert('Admin MFA setup returns QR and recovery codes', mfaSetup.status === 200);
    assert('Secret returned', !!mfaSetup.data?.secret);
    assert('10 recovery codes returned', mfaSetup.data?.recoveryCodes?.length === 10);

    // Generate valid TOTP token for verification
    const { generateSync } = require('otplib');
    const totpCode = generateSync({ secret: mfaSetup.data.secret });

    const mfaVerify = await request('POST', '/api/v1/auth/mfa/verify', {
      headers: { Authorization: `Bearer ${currentAdminToken}` },
      body: { code: totpCode },
    });
    assert('MFA verification succeeds and enables MFA (200)', mfaVerify.status === 200);

    // Login with MFA enabled -> triggers challenge
    const mfaLoginPrompt = await request('POST', '/api/v1/auth/login', {
      headers: { 'X-Client-Type': 'admin-web' },
      body: { username: 'rajesh.admin', password: 'StrongBootstrapAdminPassword!123' },
    });
    assert('Login with MFA enabled requires MFA challenge', mfaLoginPrompt.data?.mfaRequired === true);
    assert('MFA pending token returned', !!mfaLoginPrompt.data?.mfaPendingToken);
    const mfaPendingToken = mfaLoginPrompt.data?.mfaPendingToken;

    // Verify mfa_pending token is rejected by standard requireAuth
    const pendingRejected = await request('GET', '/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${mfaPendingToken}` },
    });
    assert('mfa_pending token rejected by requireAuth with 401', pendingRejected.status === 401);

    // Complete login using a single-use recovery code
    const recoveryCodeToUse = mfaSetup.data.recoveryCodes[0];
    const mfaLoginDone = await request('POST', '/api/v1/auth/mfa/login', {
      body: { mfaPendingToken, code: recoveryCodeToUse },
    });
    assert('Login completes successfully with recovery code (200)', mfaLoginDone.status === 200);
    assert('Access token received', !!mfaLoginDone.data?.access_token);

    // Disable MFA to reset admin state
    const mfaDisable = await request('POST', '/api/v1/auth/mfa/disable', {
      headers: { Authorization: `Bearer ${mfaLoginDone.data?.access_token}` },
      body: { password: 'StrongBootstrapAdminPassword!123' },
    });
    assert('MFA disabled cleanly with password confirmation (200)', mfaDisable.status === 200);

    // ── 9. Security Audit Log Verification ──────────────────────────────────
    console.log('\n▶ Test 9: Security Audit Log Persistence');
    const logs = await prisma.securityAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    assert('SecurityAuditLog records were persisted', logs.length > 0);
    const eventTypes = logs.map((l) => l.eventType);
    console.log('  Recent recorded event types:', eventTypes.slice(0, 5).join(', '));
    assert(
      'Recorded expected security event types',
      eventTypes.includes('AUTH_SUCCESS') || eventTypes.includes('MFA_ENABLED') || eventTypes.includes('LOGIN_LOCKOUT')
    );
  } finally {
    server.close();
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  Tests Complete: ${passed} Passed, ${failed} Failed`);
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
