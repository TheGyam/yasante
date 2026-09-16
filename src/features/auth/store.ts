import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User } from '@/features/profile';

// Tokens live in the device keystore, never in AsyncStorage, which is plain text.
const TOKEN_KEY = 'yasante.auth.tokens';

const saveTokens = (tokens: AuthTokens | null) =>
  (tokens
    ? SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens))
    : SecureStore.deleteItemAsync(TOKEN_KEY)
  ).catch(error => {
    if (__DEV__) console.warn('Could not write tokens to secure storage:', error);
  });

/**
 * Read tokens back into memory at app start.
 * Must finish before the first authenticated request, or it will 401 and log the user out.
 */
export const loadStoredTokens = async () => {
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) useAuthStore.setState({ tokens: JSON.parse(stored) });
  } catch (error) {
    if (__DEV__) console.warn('Could not read tokens from secure storage:', error);
  }
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      // True until loadStoredTokens() has run, so nothing treats a cold start as signed out.
      isLoading: true,

      setAuth: (user, tokens) => {
        saveTokens(tokens);
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: user => {
        set({ user });
      },

      setTokens: tokens => {
        saveTokens(tokens);
        set({ tokens });
      },

      logout: () => {
        saveTokens(null);
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: loading => {
        set({ isLoading: loading });
      },
    }),
    {
      name: '@yasante:auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Tokens are deliberately absent here — they go to secure storage instead.
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
