import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount } from '../types';
import { api, clearToken, saveToken, saveUser, loadUser, ApiError } from '../api/client';

interface LoginSuccessResponse {
  token: string;
  access_token?: string;
  mfaRequired?: false;
  mustChangePassword?: boolean;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    status: string;
    mustChangePassword?: boolean;
    lastLogin?: string;
  };
}

interface MfaChallengeResponse {
  mfaRequired: true;
  mfaPendingToken: string;
  expiresInSeconds: number;
}

type AuthApiResponse = LoginSuccessResponse | MfaChallengeResponse;

export interface LoginResult {
  success: boolean;
  mfaRequired?: boolean;
  mfaPendingToken?: string;
  mustChangePassword?: boolean;
  error?: string;
}

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutRemainingSeconds: number;
  login: (username: string, password: string) => Promise<LoginResult>;
  verifyMfaLogin: (mfaPendingToken: string, code: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(
    loadUser<UserAccount>()
  );
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  const isAuthenticated = !!currentUser;
  const isLocked = lockoutTime !== null && Date.now() < lockoutTime;

  // Countdown timer for lockout UI
  useEffect(() => {
    if (!lockoutTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutTime - Date.now()) / 1000));
      setLockoutRemainingSeconds(remaining);
      if (remaining <= 0) {
        setLockoutTime(null);
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleSuccessfulAuth = (data: LoginSuccessResponse): LoginResult => {
    const user: UserAccount = {
      id: data.user.id,
      name: data.user.name ?? data.user.username,
      username: data.user.username,
      role: 'admin',
      status: (data.user.status === 'Active' ? 'Active' : 'Locked') as 'Active' | 'Locked',
      lastLogin: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    saveToken(data.access_token || data.token);
    saveUser(user);
    setCurrentUser(user);
    setFailedAttempts(0);
    setLockoutTime(null);
    setLockoutRemainingSeconds(0);

    return {
      success: true,
      mustChangePassword: data.mustChangePassword || data.user.mustChangePassword,
    };
  };

  const login = async (
    username: string,
    password: string
  ): Promise<LoginResult> => {
    if (isLocked) {
      return {
        success: false,
        error: `Account is temporarily locked. Please try again in ${lockoutRemainingSeconds}s.`,
      };
    }

    try {
      const data = await api.post<AuthApiResponse>('/auth/login', {
        username: username.trim(),
        password,
      });

      if (data.mfaRequired) {
        return {
          success: false,
          mfaRequired: true,
          mfaPendingToken: data.mfaPendingToken,
        };
      }

      return handleSuccessfulAuth(data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const status = apiErr?.status;

      if (status === 429) {
        const retryAfter = apiErr.retryAfter || 900;
        const lockUntil = Date.now() + retryAfter * 1000;
        setLockoutTime(lockUntil);
        setLockoutRemainingSeconds(retryAfter);
        return {
          success: false,
          error: `Too many failed login attempts. Account temporarily locked for ${Math.ceil(retryAfter / 60)} minutes.`,
        };
      }

      if (status === 403) {
        return {
          success: false,
          error: apiErr.message || 'Access forbidden for this account type.',
        };
      }

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      return {
        success: false,
        error: apiErr.message || 'Invalid username or password. Please verify credentials.',
      };
    }
  };

  const verifyMfaLogin = async (
    mfaPendingToken: string,
    code: string
  ): Promise<LoginResult> => {
    try {
      const data = await api.post<LoginSuccessResponse>('/auth/mfa/login', {
        mfaPendingToken,
        code: code.trim(),
      });
      return handleSuccessfulAuth(data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      return {
        success: false,
        error: apiErr.message || 'Invalid two-factor authentication or recovery code.',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      clearToken();
      setCurrentUser(null);
      setFailedAttempts(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        failedAttempts,
        isLocked,
        lockoutRemainingSeconds,
        login,
        verifyMfaLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};