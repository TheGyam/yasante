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
 * Read tokens back into memory at app start, once the remembered account is back too.
 * Every request waits on this (see the auth bridge), so none goes out half signed in.
 */
let tokensLoaded: Promise<void> | undefined;
export const loadStoredTokens = () =>
  (tokensLoaded ??= Promise.all([
    new Promise<void>(resolve => {
      if (useAuthStore.persist.hasHydrated()) return resolve();
      const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
        unsubscribe();
        resolve();
      });
    }),
    SecureStore.getItemAsync(TOKEN_KEY).catch(error => {
      if (__DEV__) console.warn('Could not read tokens from secure storage:', error);
      return null;
    }),
  ])
    .then(([, stored]) => {
      const state = useAuthStore.getState();
      // A sign-in that finished while this was reading is newer; keep it.
      if (state.tokens) return state.setLoading(false);
      if (stored) {
        useAuthStore.setState({ tokens: JSON.parse(stored), isLoading: false });
      } else if (state.isAuthenticated) {
        // Remembered who, but no tokens (the web keeps none, or the keystore was wiped).
        state.logout();
      } else {
        state.setLoading(false);
      }
    })
    // Unreadable tokens (a corrupt keystore entry) mean signed out, not stuck loading.
    .catch(() => useAuthStore.getState().setLoading(false)));

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

// Dev only: sign in with a session fetched elsewhere (e.g. from the backend with
// curl), for testing against the real API without typing into the sign-in form.
declare global {
  // eslint-disable-next-line no-var -- globals can only be declared with var
  var devSignIn:
    | ((session: {
        user: User;
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      }) => void)
    | undefined;
}
if (__DEV__) {
  globalThis.devSignIn = ({ user, accessToken, refreshToken, expiresAt }) =>
    useAuthStore.getState().setAuth(user, { accessToken, refreshToken, expiresAt });
}
