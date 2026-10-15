import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import qrcode from 'qrcode';

const MFA_AUDIENCE = 'aero-mfa-pending';
const MFA_PENDING_EXPIRES_IN = 300; // 5 minutes

function getEncryptionKey(): Buffer {
  const rawKey = process.env.MFA_ENC_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (rawKey.length === 64) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts MFA base32 secret using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptMfaSecret(plaintextSecret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintextSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM encrypted MFA secret.
 */
export function decryptMfaSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted MFA secret format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Validates a 6-digit TOTP token against a base32 plaintext secret.
 */
export function verifyTotpToken(token: string, plaintextSecret: string): boolean {
  try {
    const cleanToken = token.trim();
    const result = verifySync({ token: cleanToken, secret: plaintextSecret });
    return result?.valid === true;
  } catch {
    return false;
  }
}

/**
 * Computes SHA-256 hash of a normalized recovery code for storage.
 */
export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/**
 * Generates 10 single-use recovery codes (8 chars hex).
 * Returns plaintext codes for display and SHA-256 hashed codes for storage.
 */
export function generateRecoveryCodes(): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
    plainCodes.push(code);
    hashedCodes.push(hashRecoveryCode(code));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Generates a complete TOTP setup payload:
 * - base32 secret
 * - otpauth URI
 * - QR code data URL
 * - encrypted secret
 * - 10 recovery codes
 */
export async function generateTotpSetup(username: string): Promise<{
  secret: string;
  encryptedSecret: string;
  qrCodeDataUrl: string;
  otpauthUri: string;
  plainRecoveryCodes: string[];
  hashedRecoveryCodes: string[];
}> {
  const secret = generateSecret();
  const otpauthUri = generateURI({
    secret,
    label: username,
    issuer: 'ParkIT',
  });

  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUri);
  const encryptedSecret = encryptMfaSecret(secret);
  const { plainCodes, hashedCodes } = generateRecoveryCodes();

  return {
    secret,
    encryptedSecret,
    qrCodeDataUrl,
    otpauthUri,
    plainRecoveryCodes: plainCodes,
    hashedRecoveryCodes: hashedCodes,
  };
}

/**
 * Issues an MFA pending token carrying typ: "mfa_pending" and aud: "aero-mfa-pending".
 * Rejected by standard requireAuth, accepted only on POST /api/v1/auth/mfa/login.
 */
export function signMfaPendingToken(userId: string, username: string): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
  return jwt.sign(
    {
      userId,
      username,
      typ: 'mfa_pending',
    },
    secret,
    {
      audience: MFA_AUDIENCE,
      expiresIn: `${MFA_PENDING_EXPIRES_IN}s`,
    }
  );
}

/**
 * Verifies an MFA pending token and extracts the userId and username.
 */
export function verifyMfaPendingToken(token: string): { userId: string; username: string } | null {
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const decoded = jwt.verify(token, secret, {
      audience: MFA_AUDIENCE,
    }) as { userId: string; username: string; typ: string };

    if (decoded.typ !== 'mfa_pending') {
      return null;
    }

    return { userId: decoded.userId, username: decoded.username };
  } catch {
    return null;
  }
}
