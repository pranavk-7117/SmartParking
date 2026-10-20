import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Car, Lock, User, AlertCircle, ShieldAlert, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, PasswordInput } from '../components/common/Input';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyMfaLogin, isAuthenticated, isLocked, lockoutRemainingSeconds } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaPendingToken, setMfaPendingToken] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string; mfaCode?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (mfaPendingToken) {
      // Handling MFA Verification
      if (!mfaCode.trim()) {
        setFieldErrors({ mfaCode: 'Authentication code is required.' });
        return;
      }
      setFieldErrors({});
      setIsSubmitting(true);
      const result = await verifyMfaLogin(mfaPendingToken, mfaCode);
      setIsSubmitting(false);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setAuthError(result.error || 'Invalid two-factor code or recovery code.');
      }
      return;
    }

    // Validate fields for primary credentials
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Username is required.';
    }
    if (!password.trim()) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else if (result.mfaRequired && result.mfaPendingToken) {
      setMfaPendingToken(result.mfaPendingToken);
      setAuthError(null);
    } else {
      setAuthError(result.error || 'Incorrect username or password.');
    }
  };

  const handleCancelMfa = () => {
    setMfaPendingToken(null);
    setMfaCode('');
    setAuthError(null);
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Back to Home link */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-primary transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Facility Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white shadow-elevated mb-1">
            <Car className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            ParkIT
          </h1>
          <p className="text-sm text-neutral-500">Sign in to continue to management dashboard</p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-card border border-neutral-200 shadow-elevated p-6 sm:p-7 space-y-5">
          {/* Account Lockout Banner */}
          {isLocked && (
            <div className="p-4 rounded-control bg-amber-50 border border-amber-300 text-amber-900 space-y-2 animate-shake">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-warning shrink-0" />
                <span>Account Temporarily Locked</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Too many failed login attempts. Try again in{' '}
                <span className="font-mono font-bold">
                  {Math.floor(lockoutRemainingSeconds / 60)}m {lockoutRemainingSeconds % 60}s
                </span>
                .
              </p>
            </div>
          )}

          {/* Invalid Credentials Inline Error Banner */}
          {!isLocked && authError && (
            <div className="p-3.5 rounded-control bg-red-50 border border-red-200 text-danger flex items-start gap-2.5 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaPendingToken ? (
              <>
                <Input
                  label="Username"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  leftIcon={<User className="w-4 h-4" />}
                  error={fieldErrors.username}
                  disabled={isLocked || isSubmitting}
                  autoComplete="username"
                />

                <PasswordInput
                  label="Password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  error={fieldErrors.password}
                  disabled={isLocked || isSubmitting}
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                  disabled={isLocked}
                >
                  Sign In
                </Button>
              </>
            ) : (
              <>
                <div className="p-3 rounded-control bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>Two-factor authentication required. Enter your 6-digit TOTP code or backup code.</span>
                </div>

                <Input
                  label="Security Code / Recovery Code"
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456 or 8-char code"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  error={fieldErrors.mfaCode}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                  autoFocus
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-1/2"
                    onClick={handleCancelMfa}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-1/2"
                    isLoading={isSubmitting}
                  >
                    Verify
                  </Button>
                </div>
              </>
            )}
          </form>

          {/* Help footer */}
          <div className="text-center pt-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              Forgot credentials? <span className="font-medium text-neutral-700">Contact system administrator.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
