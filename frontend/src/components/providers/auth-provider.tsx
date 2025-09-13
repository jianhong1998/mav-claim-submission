'use client';

import React, { createContext, useContext } from 'react';
import { useAuthStatus } from '@/hooks/auth/useAuthStatus';
import { useLogout } from '@/hooks/auth/useLogout';
import { IUser, IAuthStatusResponse } from '@project/types';

interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  logout: () => void;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { data: authStatus, isLoading, error } = useAuthStatus();

  const logoutMutation = useLogout();

  const value: AuthContextType = {
    user: (authStatus as IAuthStatusResponse)?.user ?? null,
    isAuthenticated:
      (authStatus as IAuthStatusResponse)?.isAuthenticated ?? false,
    isLoading,
    error: error as Error | null,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
