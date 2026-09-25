import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Car, Lock, User, AlertCircle, Clock, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input, PasswordInput } from '../components/common/Input';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLocked, lockoutRemainingSeconds } = useAuth();

  const [username, setUsername] = useState('rajesh.admin');
  const [password, setPassword] = useState('admin123');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Validate fields
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
    } else {
      setAuthError(result.error || 'Incorrect username or password.');
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setFieldErrors({});
    setAuthError(null);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Centered card (max-width 400px per §3.1) */}
      <div className="w-full max-w-[400px] space-y-6">
        {/* Facility Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white shadow-elevated mb-1">
            <Car className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            AeroPark System
          </h1>
          <p className="text-sm text-neutral-500">Sign in to continue to operator terminal</p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-card border border-neutral-200 shadow-elevated p-6 sm:p-7 space-y-5">
          {/* Account Lockout Banner per §3.1 */}
          {isLocked && (
            <div className="p-4 rounded-control bg-amber-50 border border-amber-300 text-amber-900 space-y-2 animate-shake">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-warning shrink-0" />
                <span>Account Temporarily Locked</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                This account is temporarily locked due to multiple failed login attempts. Try again in{' '}
                <span className="font-mono font-bold">
                  {Math.floor(lockoutRemainingSeconds / 60)}m {lockoutRemainingSeconds % 60}s
                </span>
                .
              </p>
            </div>
          )}

          {/* Invalid Credentials Inline Error Banner per §3.1 */}
          {!isLocked && authError && (
            <div className="p-3.5 rounded-control bg-red-50 border border-red-200 text-danger flex items-start gap-2.5 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rajesh.admin"
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
          </form>

          {/* Forgot password text per §3.1 */}
          <div className="text-center pt-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              Forgot your password? <span className="font-medium text-neutral-700">Contact your administrator.</span>
            </p>
          </div>
        </div>

        {/* Demo Quick-Fill Credentials Helper Box */}
        <div className="bg-neutral-100/90 rounded-card border border-neutral-200/80 p-3.5 text-xs text-neutral-600 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span>Demo Credentials (Click to fill):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('rajesh.admin', 'admin123')}
              className="p-2 rounded bg-white hover:bg-neutral-50 border border-neutral-200 text-left transition-colors"
            >
              <div className="font-bold text-neutral-900">Admin</div>
              <div className="text-[11px] text-neutral-500">rajesh.admin / admin123</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('suresh.operator', 'operator123')}
              className="p-2 rounded bg-white hover:bg-neutral-50 border border-neutral-200 text-left transition-colors"
            >
              <div className="font-bold text-neutral-900">Operator</div>
              <div className="text-[11px] text-neutral-500">suresh.operator / operator123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
