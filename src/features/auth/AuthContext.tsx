import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore, AuthTokens, loadStoredTokens } from './store';
import { setAuthBridge } from '@/shared/lib/api';
import { setAccountGate } from '@/shared/lib/navigation';
import { guestRedirect } from './accountGate';
import { User } from '@/features/profile';
import { queryClient } from '@/queryClient';
import { api } from '@/api';
import { apiClient } from '@/shared/lib/api';
import { unregisterPush } from '@/shared/lib/push';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshToken: () => Promise<boolean>;
}

// Give the HTTP client its tokens without shared/ depending on this feature. Set at
// load, not in an effect: screens' effects run before this provider's and fetch at once.
setAuthBridge({
  ready: loadStoredTokens,
  getAccessToken: () => useAuthStore.getState().tokens?.accessToken,
  getRefreshToken: () => useAuthStore.getState().tokens?.refreshToken,
  getUserId: () => useAuthStore.getState().user?.id,
  setTokens: ({ accessToken, refreshToken, expiresAt }) => {
    const current = useAuthStore.getState().tokens;
    if (!current) return;
    useAuthStore.getState().setTokens({
      ...current,
      accessToken,
      refreshToken: refreshToken ?? current.refreshToken,
      expiresAt,
    });
  },
  refresh: async refreshToken => {
    const response = await api.auth.refreshToken(refreshToken);
    return response.data;
  },
  logout: () => useAuthStore.getState().logout(),
});

setAccountGate(href => (useAuthStore.getState().isAuthenticated ? undefined : guestRedirect(href)));

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
    }))
  );

  // Signed-in state comes from two places: the persisted store (who) and secure storage
  // (tokens). loadStoredTokens stays loading until both are back.
  useEffect(() => {
    loadStoredTokens();
  }, []);

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
      const { accessToken, refreshToken: rotated, expiresAt } = response.data;

      // Convert expiresAt to timestamp if needed
      const expiresAtTimestamp =
        typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;

      // Update tokens in store
      useAuthStore.getState().setTokens({
        accessToken,
        // The server revokes the old refresh token when it sends a new one.
        refreshToken: rotated ?? tokens.refreshToken,
        expiresAt: expiresAtTimestamp,
      });

      if (__DEV__) {
        console.log('✅ Token refreshed successfully');
      }

      return true;
    } catch (error: any) {
      // No answer (offline, server down) isn't a verdict: keep her signed in and try
      // again later. Only a server that refuses the token ends the session.
      if (error.response) logoutStore();
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
    // Tell the server first, while still signed in: stop this phone's notifications
    // and end the session, so a copied refresh token stops working too. Capped, so
    // signing out offline still signs out.
    const refresh = useAuthStore.getState().tokens?.refreshToken;
    await Promise.race([
      Promise.allSettled([
        unregisterPush(),
        refresh ? apiClient.post('/api/auth/logout/', { refreshToken: refresh }) : null,
      ]),
      new Promise(resolve => setTimeout(resolve, 3000)),
    ]);
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
