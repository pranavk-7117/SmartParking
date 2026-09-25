import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount } from '../types';
import { api, clearToken, saveToken, saveUser, loadUser } from '../api/client';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    status: string;
    lastLogin?: string;
  };
}

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutRemainingSeconds: number;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isLocked) {
      return { success: false, error: 'Account is temporarily locked. Please try again later.' };
    }

    try {
      const data = await api.post<LoginResponse>('/auth/login', {
        username: username.trim(),
        password,
      });

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

      saveToken(data.token);
      saveUser(user);
      setCurrentUser(user);
      setFailedAttempts(0);
      return { success: true };
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;

      if (status === 403) {
        return {
          success: false,
          error: 'Your account has been terminated. Please contact the system administrator.',
        };
      }

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 5) {
        const lockUntil = Date.now() + 5 * 60 * 1000;
        setLockoutTime(lockUntil);
        setLockoutRemainingSeconds(300);
        return {
          success: false,
          error: 'Too many failed login attempts. Account temporarily locked for 5 minutes.',
        };
      }

      return {
        success: false,
        error: 'Invalid username or password. Please verify credentials.',
      };
    }
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
    setFailedAttempts(0);
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