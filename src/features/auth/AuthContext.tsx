import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore, AuthTokens, loadStoredTokens } from './store';
import { setAuthBridge } from '@/shared/lib/api';
import { User } from '@/features/profile';
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
  } = useAuthStore(
    // Only what this provider uses: every screen reads the context, so a change to
    // anything else in the store must not re-render the app.
    useShallow(s => ({
      user: s.user,
      tokens: s.tokens,
      isAuthenticated: s.isAuthenticated,
      isLoading: s.isLoading,
      setAuth: s.setAuth,
      setUser: s.setUser,
      logout: s.logout,
      setLoading: s.setLoading,
    }))
  );

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

  // Signed-in state comes from two places: the persisted store (who) and secure storage
  // (tokens). Stay loading until both are back, so a cold start never looks signed out.
  useEffect(() => {
    const hydrated = useAuthStore.persist.hasHydrated()
      ? Promise.resolve()
      : new Promise<void>(resolve => {
          const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
          });
        });
    Promise.all([hydrated, loadStoredTokens()]).finally(() => setLoading(false));
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

      if (__DEV__) {
        console.log('✅ Logout successful - cache cleared');
      }
    } catch (error) {
      // Even if cache clearing fails, proceed with logout
      console.error('Error during logout cleanup:', error);
      logoutStore();
    }
  }, [logoutStore]);

  const updateUser = useCallback(
    (user: User) => {
      setUser(user);
    },
    [setUser]
  );

  // A new object only when something in it changes, or every consumer re-renders.
  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated, isLoading, login, logout, updateUser, refreshToken }),
    [user, isAuthenticated, isLoading, login, logout, updateUser, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
