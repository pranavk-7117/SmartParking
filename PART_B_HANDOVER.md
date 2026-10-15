# Part B Handover: Core Operations, Gateway Hardening & Android Client Security

> ### 🚀 READY-TO-PASTE KICKOFF PROMPT FOR TEAMMATE B'S ANTIGRAVITY
> 
> ```markdown
> You are working as Developer B on a security hardening sprint for the Smart Parking Management System.
> 
> INSTRUCTIONS:
> 1. Read docs/security/API_CONTRACT.md and docs/security/PART_B_HANDOVER.md thoroughly.
> 2. Study only the files assigned to Part B in the file ownership matrix below. Do not touch files assigned to Part A or Foundation.
> 3. Confirm your understanding of your scope and decisions.
> 4. Give me a concise implementation plan of how you will execute your assigned tasks.
> 5. Wait for my approval before modifying any code.
> 6. Do NOT execute git commands; tell me what commands to run.
> 7. Never log or print real secrets. Maintain documentation integrity.
> ```

---

## 1. Project & Security Context

You are production-hardening a real-world Smart Parking system deployed in Pune, India.
* **Architecture:** Express.js + Prisma ORM + PostgreSQL backend; React Admin web dashboard; Native Android operator handheld app (Kotlin/Compose/Retrofit); Public kiosk display.
* **Key Decisions Already Locked:**
  * No Google Sign-In; operators log in via username/password on Android.
  * No Aadhaar or national ID data.
  * Bearer JWT tokens with database `tokenVersion` check on every request.
  * Operator access tokens expire in **12 hours**; Admin in **2 hours**.
  * Lockout is 5 attempts / 15 minutes per username+IP.
  * Sessions are never hard-deleted; they are soft-voided (`VOIDED`) with a mandatory reason.
  * No certificate pinning (for initial release). Enforce HTTPS + system CA validation.
  * Single Admin mathematically enforced.

---

## 2. Ground Rules
1. **Never print, log, or copy real secrets, keys, or passwords.**
2. **Do not use shell tricks** like base64 or inline python scripts to write files. Use standard tools.
3. **Do not run git commands.** Provide them for the user to run.
4. **Do not break existing functionality.** Preserve every operational gate workflow.
5. **Edit ONLY files in your assigned scope.** If a change is needed in a file owned by Part A or Foundation, notify the user instead of touching it.

---

## 3. Branching & Setup
 
```bash
# To start early before Foundation lands (straight off main):
git checkout main
git checkout -b security/part-b

# When Foundation lands on origin:
git fetch origin
git merge origin/security/foundation -m "merge: integrate security foundation"
npx prisma generate
npx prisma migrate deploy

# Set up and migrate test database:
# Windows PowerShell:
# $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_parking_test?schema=public"; npx prisma migrate deploy
# Or via cross-env / npx:
cross-env DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_parking_test?schema=public" npx prisma migrate deploy
```

---

## 4. File Ownership

### ✅ Files You Own:
* **Backend:**
  * `src/app.ts` (Mounts Helmet, CORS allowlist, request body cap, `trust proxy`, rate limiters)
  * `src/index.ts` (Startup secret validation, obfuscated APK route)
  * `src/routes/entries.ts`
  * `src/routes/exits.ts`
  * `src/routes/sessions.ts`
  * `src/routes/slots.ts`
  * `src/routes/rates.ts`
  * `src/routes/sites.ts`
  * `src/routes/locations.ts`
  * `src/routes/display.ts`
  * `src/middleware/errorHandler.ts`
  * `src/middleware/rateLimiter.ts`
  * `src/lib/validation.ts`
  * `test/operations-gateway-android.test.ts`
  * `docs/security/PRODUCTION_DEPLOYMENT.md`
* **Android (All files under `operator-app/`):**
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/data/remote/ApiService.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/data/remote/dto/Dtos.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/data/remote/ApiClient.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/data/repository/AuthRepository.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/data/repository/ParkingRepository.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/ui/screens/login/LoginScreen.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/ui/screens/settings/SettingsScreen.kt`
  * `operator-app/app/src/main/java/com/example/smartparkingoperator/ui/navigation/AppNavigation.kt`
  * `operator-app/app/src/main/AndroidManifest.xml`
  * `operator-app/app/src/main/res/xml/network_security_config.xml` (new)
  * `operator-app/app/build.gradle.kts`
  * `operator-app/proguard-rules.pro`
  * `operator-app/gradle/libs.versions.toml`

### ❌ Files You Must NOT Touch:
* `prisma/schema.prisma` or migrations (Frozen in Foundation)
* `package.json` / `package-lock.json` (Frozen in Foundation)
* `src/middleware/auth.ts` (Frozen in Foundation)
* `src/routes/auth.ts`, `operators.ts`, `reports.ts`, `notifications.ts`, `me.ts` (Owned by Part A)
* Any file under `frontend/` (Owned by Part A)

---

## 5. Ordered Task List & Acceptance Criteria

### Phase 1: Immediate-Start Tasks (Off `main`)
* **Task B-0 (Android Manifest):**
  * In `operator-app/app/src/main/AndroidManifest.xml`, set `android:usesCleartextTraffic="false"` and `android:allowBackup="false"`.
* **Task B-1 (Network Security Config):**
  * Create `operator-app/app/src/main/res/xml/network_security_config.xml`: enforce system trust anchor, disable cleartext. Attach to manifest.
* **Task B-2 (Gradle & ProGuard Hardening):**
  * In `operator-app/app/build.gradle.kts`: set `isMinifyEnabled = true` for release; inject `API_BASE_URL` from `buildConfigField`.
  * Add keep rules in `proguard-rules.pro` for Retrofit DTOs, Gson, CameraX, and ML Kit.
* **Task B-3 (Validation Schemas):**
  * In `src/lib/validation.ts`: define Zod schemas for query pagination (`limit` default 50, max 200; `offset`), vehicle plate regex (`^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$`), and timestamp bounds.
* **Task B-4 (Deployment Guide):**
  * Author `docs/security/PRODUCTION_DEPLOYMENT.md` covering VPC security groups, reverse proxy Nginx configuration (including real CSP headers and `X-Forwarded-For`), private RDS users, and automated backups.

### Phase 2: Post-Foundation Backend Operations & Gateway
* **Task B-5 (Entries & Exits):**
  * `src/routes/entries.ts`:
    * Validate `req.user.locationId === body.location_id` (or use `enforceSiteScope`).
    * Bound `device_timestamp`: reject future timestamps $> 5\text{ min}$ or past $> 24\text{ hours}$.
    * Atomic slot allocation inside Prisma transaction with concurrency guard.
  * `src/routes/exits.ts`:
    * Enforce that session being closed belongs to operator's assigned site.
    * Bound `device_timestamp`.
* **Task B-6 (Sessions, Slots, Rates, Sites):**
  * `src/routes/sessions.ts`:
    * Scope reads for operators to their assigned site.
    * Implement `limit` and `offset` pagination, returning `X-Total-Count` header.
    * Implement `POST /api/v1/sessions/:id/void { reason }` (Admin only). Sets `status = 'VOIDED'`, vacates slot, records audit log.
    * Return `405 Method Not Allowed` on `DELETE /api/v1/sessions/:id`.
    * Use Foundation's `assertSiteAccess(req, session.slot.locationId)` for single session lookups.
  * `src/routes/slots.ts`:
    * Scope operator reads to assigned site. Use `assertSiteAccess(req, slot.locationId)`.
    * Restrict slot creation, status change, and category change to `requireAdmin`.
  * `src/routes/rates.ts`:
    * Protect `POST /rates` with `requireAdmin`. Remove `body.adminName` (derive from `req.user.username`).
    * Scope operator rate reads to assigned site.
  * `src/routes/sites.ts` & `src/routes/locations.ts`:
    * Admin-only on sites; operator site-scoped availability on locations.
* **Task B-7 (Kiosk Display):**
  * `src/routes/display.ts`: Remove silent fallback $\rightarrow$ return `404 Not Found` if site not found or inactive.
* **Task B-8 (App Gateway & Security Middleware):**
  * `src/middleware/rateLimiter.ts`: Implement global rate limiter (300/15m), login rate limiter, and kiosk limiter (120/1m).
  * `src/middleware/errorHandler.ts`: In production, mask 500 errors with UUID incident ID. Log stack server-side only.
  * `src/app.ts`: Mount Helmet, CORS allowlist, request body cap (100kb), `trust proxy 1`, and rate limiters.
  * `src/index.ts`:
    * Startup validation: fail fast at boot if any required env var is missing or insecure: `JWT_SECRET` (missing or default/short < 32 chars), `MFA_ENC_KEY` (must be exactly 32 bytes / 64 hex chars), `ALLOWED_ORIGINS` (must be defined), `APK_DOWNLOAD_SECRET_PATH` (must be defined and start with `/`).
    * Implement obfuscated APK download at `/distribution/:secretPath` with rate limiting.

### Phase 3: Mid-Point Sync (Git Commands)
Once backend tasks B-5 through B-8 are complete:
```bash
git add .
git commit -m "feat(security): complete part-b operations, gateway, and rate limiting"
git push origin security/part-b

# Fetch and merge Part A's backend work:
git fetch origin
git merge origin/security/part-a -m "merge: integrate part-a backend identity"
```

### Phase 4: Android App Hardening
* **Task B-9 (Android Networking & Auth):**
  * `ApiClient.kt`:
    * Inject `X-Client-Type: operator-android` on all requests.
    * Disable `HttpLoggingInterceptor.Level.BODY` in release (`if (BuildConfig.DEBUG)`).
    * Use `BuildConfig.API_BASE_URL`.
  * `AuthRepository.kt`:
    * On `401 Unauthorized`: wipe secure session and trigger logout.
    * Handle `403` and `429` with user-friendly messages.
    * Observe `mustChangePassword` from login response.
  * `LoginScreen.kt` & `AppNavigation.kt`:
    * Display 429 lockout retry message.
    * If `mustChangePassword == true`, route directly to password change dialog.
  * `SettingsScreen.kt`: Enforce strong password validation.
  * **Grep Audit for Android Aggregation:** Grep `operator-app` for client-side aggregations over `activeSessions` array to ensure pagination does not truncate counts. Update `ApiService.kt` and `ParkingRepository.kt` to pass `limit`/`offset` and read `X-Total-Count`.

### Phase 5: Verification
* **Task B-10 (Automated Tests):** Run `test/operations-gateway-android.test.ts` against `TEST_DATABASE_URL`.
* **Task B-11 (Manual Android Verification):**
  1. Build release APK: `./gradlew assembleRelease`.
  2. Verify cleartext blocked (fails on `http://`).
  3. Verify release Logcat contains zero request bodies, tokens, or passwords.
  4. Verify terminating operator immediately kicks app back to login screen on next API call.
