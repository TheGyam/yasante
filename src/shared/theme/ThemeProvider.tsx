import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, type Theme } from './themes';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/** The user's choice. The only place the colour scheme is persisted. */
export const useThemePreference = create<ThemePreferenceState>()(
  persist(
    set => ({
      preference: 'system',
      setPreference: preference => set({ preference }),
    }),
    { name: '@yasante:theme-preference', storage: createJSONStorage(() => AsyncStorage) }
  )
);

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useThemePreference(s => s.preference);
  const system = useColorScheme();
  const scheme = preference === 'system' ? (system ?? 'dark') : preference;

  // Always one of two module-level objects, so consumers only re-render when the
  // scheme genuinely flips.
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Define a component's styles once per theme, outside render.
 *
 * Both variants are created at module load, so the hook is a context read and a
 * ternary — no allocation, no StyleSheet work, and a stable reference per scheme.
 *
 *   const useStyles = makeStyles(t => ({ card: { backgroundColor: t.colors.glass.fill } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (theme: Theme) => T & StyleSheet.NamedStyles<any>
): () => T {
  const light = StyleSheet.create(factory(lightTheme));
  const dark = StyleSheet.create(factory(darkTheme));
  return function useStyles() {
    return useTheme().scheme === 'dark' ? dark : light;
  };
}
