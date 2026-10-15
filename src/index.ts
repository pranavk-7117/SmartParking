import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { app } from './app';
import { apkLimiter } from './middleware/rateLimiter';

// ── Startup Secret Validation ─────────────────────────────────────────────────
// Fail fast at boot if required environment variables are missing or insecure.
// This prevents a misconfigured server from ever accepting requests.

function validateEnv(): void {
  const errors: string[] = [];

  // JWT_SECRET: must be set and be at least 32 characters long
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is not set');
  } else if (jwtSecret.length < 32) {
    errors.push(`JWT_SECRET is too short (${jwtSecret.length} chars). Minimum is 32 characters.`);
  } else if (
    jwtSecret === 'your_super_secret_key_change_me_in_production' ||
    jwtSecret === 'changeme' ||
    jwtSecret === 'secret'
  ) {
    errors.push('JWT_SECRET is using a known insecure default value. Set a strong random secret.');
  }

  // MFA_ENC_KEY: if set, must be exactly 64 hex characters (32 bytes)
  const mfaKey = process.env.MFA_ENC_KEY;
  if (mfaKey !== undefined && mfaKey !== '') {
    if (!/^[0-9a-fA-F]{64}$/.test(mfaKey)) {
      errors.push('MFA_ENC_KEY must be exactly 64 hex characters (32 bytes)');
    }
  }

  // CORS_ALLOWED_ORIGINS: must be defined and non-empty in production
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!allowedOrigins || allowedOrigins.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      errors.push('CORS_ALLOWED_ORIGINS must be defined in production');
    } else {
      console.warn('[startup] CORS_ALLOWED_ORIGINS is not set — CORS will reject all browser origins');
    }
  }

  // APK_DOWNLOAD_SECRET_PATH: must be defined and start with '/'
  const apkPath = process.env.APK_DOWNLOAD_SECRET_PATH;
  if (!apkPath) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('APK_DOWNLOAD_SECRET_PATH is not set');
    }
  } else if (!apkPath.startsWith('/')) {
    errors.push('APK_DOWNLOAD_SECRET_PATH must start with a leading "/"');
  }

  if (errors.length > 0) {
    console.error('[startup] FATAL: Server configuration is invalid:');
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }

  console.log('[startup] Environment validation passed');
}

validateEnv();

// ── Obfuscated APK Distribution ───────────────────────────────────────────────
// Serves the operator APK at a secret path defined by APK_DOWNLOAD_SECRET_PATH.
// The old /download/operator-app.apk route is intentionally removed.
//
// Example env: APK_DOWNLOAD_SECRET_PATH=/distribution/d9f8e7a6b5c4123-operator.apk
// Serves:      GET /distribution/d9f8e7a6b5c4123-operator.apk

const apkSecretPath = process.env.APK_DOWNLOAD_SECRET_PATH;

if (apkSecretPath) {
  app.get(apkSecretPath, apkLimiter, (_req, res) => {
    // Resolve APK file relative to the project root
    const apkFilePath = path.resolve(__dirname, '../operator-app.apk');

    if (!fs.existsSync(apkFilePath)) {
      res.status(404).json({ error: 'APK not found' });
      return;
    }

    res.setHeader('Content-Disposition', 'attachment; filename="smart-parking-operator.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.download(apkFilePath, 'smart-parking-operator.apk');
  });

  console.log(`[startup] APK distribution route registered`);
}

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Smart Parking API running on http://0.0.0.0:${PORT}`);
});
