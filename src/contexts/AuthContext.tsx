import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuthStore, AuthTokens } from '@/state/stores/authStore';
import { User } from '@/types/user';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    setAuth,
    setUser,
    logout: logoutStore,
    setLoading,
  } = useAuthStore();

  const router = useRouter();
  const segments = useSegments();

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt;
  }, [tokens]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) return false;

    try {
      // In a real app, this would call the API
      // For now, we'll just check if the token is still valid
      if (!isTokenExpired()) {
        return true;
      }

      // Token expired, need to re-authenticate
      logoutStore();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logoutStore();
      return false;
    }
  }, [tokens, isTokenExpired, logoutStore]);

  // Auto-refresh token on mount and periodically
  useEffect(() => {
    if (isAuthenticated && tokens) {
      // Check token expiration
      if (isTokenExpired()) {
        refreshToken();
      } else {
        // Set up auto-refresh before expiration (refresh 1 minute before)
        const timeUntilExpiry = tokens.expiresAt - Date.now();
        const refreshTime = Math.max(0, timeUntilExpiry - 60000); // 1 minute before expiry

        const timeout = setTimeout(() => {
          refreshToken();
        }, refreshTime);

        return () => clearTimeout(timeout);
      }
    }
  }, [isAuthenticated, tokens, isTokenExpired, refreshToken]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const isOnboarding = segments[0] === undefined || segments[0] === 'index' || segments[0] === 'onboarding';

    // Don't redirect if on onboarding or index - let those screens handle their own navigation
    if (isOnboarding) return;

    // Allow all routes to be accessible - screens will handle showing appropriate content
    // Only redirect authenticated users away from auth screens
    if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  const login = useCallback((user: User, tokens: AuthTokens) => {
    setAuth(user, tokens);
  }, [setAuth]);

  const logout = useCallback(() => {
    logoutStore();
    router.replace('/auth/login');
  }, [logoutStore, router]);

  const updateUser = useCallback((user: User) => {
    setUser(user);
  }, [setUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

