# Part A Plan: Identity, Governance, Security Audit & Web Client Hardening

**Branch:** `security/part-a` (branched from `origin/security/foundation`)  
**Owner:** Developer A

---

## 1. Scope & Owned Files

Developer A strictly owns and edits the following files:

### Backend:
* `src/routes/auth.ts`
* `src/routes/operators.ts`
* `src/routes/reports.ts`
* `src/routes/notifications.ts`
* `src/routes/me.ts`
* `src/lib/audit.ts` (Full implementation)
* `src/lib/mfa.ts`
* `src/lib/password.ts`
* `prisma/seed.ts`
* `test/auth-identity-audit.test.ts`
* `test/authorization-matrix.test.ts` (Post-merge route audit & full matrix test)

### Frontend (All files under `frontend/`):
* `frontend/src/api/client.ts`
* `frontend/src/context/AuthContext.tsx`
* `frontend/src/context/LiveDataContext.tsx`
* `frontend/src/types/index.ts`
* `frontend/src/pages/Login.tsx`
* `frontend/src/pages/Settings.tsx`
* `frontend/src/pages/OperatorManagement.tsx`
* `frontend/src/pages/OperatorProfile.tsx`
* `frontend/src/pages/SessionHistory.tsx`
* `frontend/src/pages/SessionDetail.tsx`
* `frontend/src/pages/Dashboard.tsx`
* `frontend/src/pages/SlotDetail.tsx`
* `frontend/src/pages/KioskDisplay.tsx`
* `frontend/src/components/layout/DevControlBar.tsx`
* `frontend/src/components/layout/DashboardLayout.tsx`
* `frontend/src/utils/exportUtils.ts`
* `frontend/index.html`
* `frontend/package.json`

---

## 2. Step-by-Step Task Execution

### Phase 0: Git Initialization & Upstream Push
After the three security documents and Foundation commit are created on `main`:
```bash
git push origin main
```
Developer A creates and tracks the Part A branch:
```bash
git checkout -b security/part-a main
```

### Phase 1: Immediate-Start Tasks (Parallel to Foundation or Branch Kickoff)
1. **Task A-0 (CSV Sanitization):** In `frontend/src/utils/exportUtils.ts`, sanitize cells starting with `=`, `+`, `-`, `@` by prepending `'`.
2. **Task A-1 (Login Purge):** In `frontend/src/pages/Login.tsx`, remove hardcoded default credentials and remove the "Demo Credentials" box.
3. **Task A-2 (Password Validator):** Implement `src/lib/password.ts`:
   * Enforces $\ge 10$ chars for Admin, $\ge 8$ for Operator, with uppercase, lowercase, digit, and symbol.
   * Bcrypt hashing at cost 12.
4. **Task A-3 (MFA Engine):** Implement `src/lib/mfa.ts`:
   * TOTP generation and verification via `otplib`.
   * AES-256-GCM encryption of `mfaSecret` at rest using `process.env.MFA_ENC_KEY`.
   * SHA-256/bcrypt hashing of backup recovery codes.
   * MFA pending tokens signed with distinct `aud: 'aero-mfa-pending'` and `typ: 'mfa_pending'`.

### Phase 2: Post-Foundation Backend Implementation
*Run Foundation migrations:*
```bash
npx prisma generate
npx prisma migrate deploy
# Test DB migration:
cross-env DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_parking_test?schema=public" npx prisma migrate deploy
```
5. **Task A-4 (Audit Logger):** Implement `src/lib/audit.ts` writing to `SecurityAuditLog`. Add in-memory sliding window to rate-limit/dedupe 401/403 logs from the same IP (max 1 log per 30s per unique IP+route).
6. **Task A-5 (Auth Hardening):** In `src/routes/auth.ts`:
   * Validate `X-Client-Type: admin-web`.
   * Constant-time dummy hash verification for non-existent users (identical message and timing).
   * DB-backed lockout via `LoginAttempt` model (5 failures / 15m per username+IP) applying equally to non-existent users.
   * Global username progressive delay on failures.
   * Issue 2h token for Admin with `typ: 'access'`.
   * Implement `POST /logout` (bumps `tokenVersion`).
   * Implement TOTP MFA endpoints (`/mfa/setup`, `/mfa/verify`, `/mfa/login`, `/mfa/disable`).
7. **Task A-6 (Governance Endpoints):**
   * `src/routes/operators.ts`: Protect with `requireAdmin`. Enforce password policy. Set `mustChangePassword: true` on creation. Bump `tokenVersion` on terminate/reassign.
   * `src/routes/reports.ts`: Protect with `requireAdmin`. Add Zod query schema.
   * `src/routes/notifications.ts`: Protect create/delete with `requireAdmin`. Derive sender from `req.user.username`.
   * `src/routes/me.ts`: Ensure operators access only their assigned location.
8. **Task A-7 (Production Bootstrap):** In `prisma/seed.ts`, bootstrap the single admin account using `process.env.ADMIN_BOOTSTRAP_PASSWORD`. Gate demo sites/operators behind `NODE_ENV !== 'production'`.

### Phase 3: Mid-Point Sync (Git Commands)
Once backend tasks A-4 through A-7 are complete:
```bash
git add .
git commit -m "feat(security): complete part-a backend identity, governance, and audit"
git push origin security/part-a

# Fetch and merge Part B's backend work (conflict-free by design):
git fetch origin
git merge origin/security/part-b -m "merge: integrate part-b backend operations"
```

### Phase 4: Frontend Web Client Hardening
9. **Task A-8 (Client Session & Voiding):**
   * `client.ts`: Send `X-Client-Type: admin-web`, wipe `localStorage` on 401, handle 429 countdown. Parse `X-Total-Count` header.
   * `types/index.ts`: Add `Voided` to `SessionStatus`.
   * `SessionDetail.tsx` & `LiveDataContext.tsx`: Replace Delete with Void modal (`POST /api/v1/sessions/:id/void { reason }`).
   * `SessionHistory.tsx`: Display `Voided` badge and pagination controls.
   * **Grep Audit for Client-Side Aggregation:** Grep all frontend files (`Dashboard.tsx`, `Reports.tsx`, `SiteDetails.tsx`, etc.) for `.filter()` or `.reduce()` on sessions array. Replace client-side slicing/summing with server-side queries or explicit limit overrides so pagination never silently truncates summary metrics.
   * `KioskDisplay.tsx`: Show graceful 404 message if site is invalid/inactive.
   * `DevControlBar.tsx`: Remove from production bundle (`import.meta.env.DEV` gate).
   * `index.html`: Add CSP meta tag with environment-configurable `connect-src` (`%VITE_API_ORIGIN%` or Vite HTML replacement placeholder, defaulting to `'self'` rather than hardcoded `localhost:3000`).
   * `package.json`: Run `npm audit fix` for safe frontend package updates.

### Phase 5: Verification & Tests
10. **Task A-9 (Automated Tests):** Author `test/auth-identity-audit.test.ts` running against `TEST_DATABASE_URL`.
11. **Task A-10 (Post-Merge Full Matrix Audit):** Author `test/authorization-matrix.test.ts`:
    * Tests every single endpoint against the 4 actors: Admin, Operator (own site), Operator (other site), Unauthenticated.
    * Route inventory test: introspects Express router stack and fails if any route has no auth middleware and is not in the explicit public allowlist (`/health`, `/api/v1/auth/login`, `/api/v1/auth/mfa/login`, `/api/v1/display/:siteId`, `/distribution/:secretPath`).
