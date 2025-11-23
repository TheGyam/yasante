import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { colors, ColorScheme, Colors } from './colors';
import { typography, Typography } from './typography';
import { spacing, Spacing } from './spacing';
import { sizes, Sizes } from './sizes';

export interface Theme {
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  sizes: Sizes;
  colorScheme: ColorScheme;
  isDark: boolean;
}

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme | 'auto') => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useRNColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme | 'auto'>('auto');
  
  const resolvedColorScheme: ColorScheme = 
    colorScheme === 'auto' 
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : colorScheme;

  const theme: Theme = {
    colors: colors[resolvedColorScheme],
    typography,
    spacing,
    sizes,
    colorScheme: resolvedColorScheme,
    isDark: resolvedColorScheme === 'dark',
  };

  const setColorScheme = (scheme: ColorScheme | 'auto') => {
    setColorSchemeState(scheme);
  };

  const toggleColorScheme = () => {
    setColorSchemeState(prev => {
      if (prev === 'auto') return 'light';
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, colorScheme: resolvedColorScheme, setColorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};














