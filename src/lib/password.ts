import bcrypt from 'bcryptjs';

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

// Pre-computed bcrypt hash with cost 12 for timing-invariant dummy comparisons
// Hash of dummy password "ParkIT#DummyPassword!2026"
const DUMMY_HASH = '$2a$12$e8Yk2e.n.9W.M9e.l4SqeOS65U8N8c2pU0jN8iU0KzQY.o9kM2sSu';

// Known demo passwords that must never be used or chosen in production
const FORBIDDEN_DEMO_PASSWORDS = [
  'admin123',
  'admin1234',
  'password',
  'password123',
  '12345678',
  'change_me_admin_password',
  'parkit@123',
  'operator@123',
  'admin@123'
];

/**
 * Validates password complexity:
 * - Admin: min 10 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
 * - Operator / default: min 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
 * - Rejects known demo and default passwords
 */
export function validatePassword(password: string, role: string = 'operator'): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (FORBIDDEN_DEMO_PASSWORDS.includes(password.trim().toLowerCase())) {
    return {
      valid: false,
      error: 'Cannot use default or demo credentials. Please choose a unique, strong password.',
    };
  }

  const isAdmin = role.toLowerCase() === 'admin';
  const minLength = isAdmin ? 10 : 8;

  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters for ${isAdmin ? 'Administrator' : 'Operator'} accounts`,
    };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one digit' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character or symbol' };
  }

  return { valid: true };
}

/**
 * Hashes password using bcrypt at cost factor 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Executes a constant-time comparison against a precomputed cost-12 dummy hash.
 * Used when a requested username does not exist to prevent timing attacks.
 */
export async function verifyDummyPassword(password: string): Promise<boolean> {
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
}
