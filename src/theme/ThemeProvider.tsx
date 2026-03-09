import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radii, fontSizes, lineHeights, fontWeights, fontFamily, iconSizes, shadows, breakpoints } from './tokens';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface Theme {
  colors: {
    primary: string;
    primaryVariant: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    accentSecondary: string;
    background: string;
    surface: string;
    surfaceVariant: string;
    border: string;
    borderLight: string;
    text: {
      high: string;
      medium: string;
      low: string;
      disabled: string;
    };
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  spacing: typeof spacing;
  radii: typeof radii;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  fontWeights: typeof fontWeights;
  fontFamily: typeof fontFamily;
  iconSizes: typeof iconSizes;
  shadows: typeof shadows;
  breakpoints: typeof breakpoints;
  isDark: boolean;
}

interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@kalon:theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setColorSchemeState(saved as ColorScheme);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadTheme();
  }, []);

  // Save theme preference
  const setColorScheme = async (scheme: ColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
      setColorSchemeState(scheme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  // Determine actual theme (light or dark)
  const actualScheme = useMemo(() => {
    if (colorScheme === 'system') {
      return systemColorScheme || 'light';
    }
    return colorScheme;
  }, [colorScheme, systemColorScheme]);

  const isDark = actualScheme === 'dark';

  // Create theme object
  const theme: Theme = useMemo(
    () => ({
      colors: {
        primary: colors.primary,
        primaryVariant: colors.primaryVariant,
        primaryLight: colors.primaryLight,
        accent: colors.accent,
        accentLight: colors.accentLight,
        accentDark: colors.accentDark,
        accentSecondary: colors.accentSecondary,
        background: isDark ? colors.dark.background : colors.light.background,
        surface: isDark ? colors.dark.surface : colors.light.surface,
        surfaceVariant: isDark ? colors.dark.surfaceVariant : colors.light.surfaceVariant,
        border: isDark ? colors.dark.border : colors.light.border,
        borderLight: isDark ? colors.dark.borderLight : colors.light.borderLight,
        text: isDark ? colors.dark.text : colors.light.text,
        error: isDark ? colors.dark.error : colors.light.error,
        success: isDark ? colors.dark.success : colors.light.success,
        warning: isDark ? colors.dark.warning : colors.light.warning,
        info: isDark ? colors.dark.info : colors.light.info,
      },
      spacing,
      radii,
      fontSizes,
      lineHeights,
      fontWeights,
      fontFamily,
      iconSizes,
      shadows,
      breakpoints,
      isDark,
    }),
    [isDark]
  );

  const toggleTheme = () => {
    const newScheme = isDark ? 'light' : 'dark';
    setColorScheme(newScheme);
  };

  const value: ThemeContextValue = {
    theme,
    colorScheme,
    setColorScheme,
    toggleTheme,
  };

  // Don't render until theme is loaded to avoid flash
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

