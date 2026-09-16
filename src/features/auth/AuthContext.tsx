import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuthStore, AuthTokens, loadStoredTokens } from './store';
import { setAuthBridge } from '@/shared/lib/api';
import { User } from '@/features/profile';
import { useRouter, useSegments } from 'expo-router';
import { queryClient } from '@/queryClient';
import { api } from '@/api';

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

  // Give the HTTP client its tokens without shared/ depending on this feature.
  useEffect(() => {
    setAuthBridge({
      getAccessToken: () => useAuthStore.getState().tokens?.accessToken,
      getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken,
      getUserId: () => useAuthStore.getState().user?.id,
      setTokens: ({ accessToken, expiresAt }) => {
        const current = useAuthStore.getState().tokens;
        if (!current) return;
        useAuthStore.getState().setTokens({ ...current, accessToken, expiresAt });
      },
      refresh: async refreshToken => {
        const response = await api.auth.refreshToken(refreshToken);
        return response.data;
      },
      logout: () => useAuthStore.getState().logout(),
    });
  }, []);

  // Load tokens out of secure storage before anything tries to use them.
  useEffect(() => {
    loadStoredTokens().finally(() => setLoading(false));
  }, [setLoading]);

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt;
  }, [tokens]);

  // Refresh token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) {
      if (__DEV__) {
        console.log('❌ No refresh token available');
      }
      return false;
    }

    try {
      // Check if token is still valid (not expired)
      if (!isTokenExpired()) {
        if (__DEV__) {
          console.log('✅ Access token still valid, no refresh needed');
        }
        return true;
      }

      if (__DEV__) {
        console.log('🔄 Access token expired, refreshing...');
      }

      // Call the API to refresh the token
      const response = await api.auth.refreshToken(tokens.refreshToken);
      const { accessToken, expiresAt } = response.data;

      // Convert expiresAt to timestamp if needed
      const expiresAtTimestamp =
        typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;

      // Update tokens in store
      useAuthStore.getState().setTokens({
        accessToken,
        refreshToken: tokens.refreshToken, // Keep the same refresh token
        expiresAt: expiresAtTimestamp,
      });

      if (__DEV__) {
        console.log('✅ Token refreshed successfully');
      }

      return true;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Token refresh failed:', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      // Token refresh failed, logout user
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
    const isOnboarding =
      segments[0] === undefined || segments[0] === 'index' || segments[0] === 'onboarding';

    // Don't redirect if on onboarding or index - let those screens handle their own navigation
    if (isOnboarding) return;

    // Allow all routes to be accessible - screens will handle showing appropriate content
    // Only redirect authenticated users away from auth screens
    if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  const login = useCallback(
    (user: User, tokens: AuthTokens) => {
      setAuth(user, tokens);
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      // Clear React Query cache to remove all user-specific data
      await queryClient.clear();

      // Clear persisted cache storage
      try {
        const { asyncStoragePersister } = await import('@/shared/utils/cachePersistence');
        await asyncStoragePersister.removeClient();
      } catch (persisterError) {
        // If persister removal fails, try manual removal
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
        } catch (storageError) {
          console.warn('Failed to clear persisted cache:', storageError);
        }
      }

      // Logout from auth store (clears tokens and user)
      logoutStore();

      // Navigate to login screen
      router.replace('/auth/login');

      if (__DEV__) {
        console.log('✅ Logout successful - cache cleared');
      }
    } catch (error) {
      // Even if cache clearing fails, proceed with logout
      console.error('Error during logout cleanup:', error);
      logoutStore();
      router.replace('/auth/login');
    }
  }, [logoutStore, router]);

  const updateUser = useCallback(
    (user: User) => {
      setUser(user);
    },
    [setUser]
  );

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
