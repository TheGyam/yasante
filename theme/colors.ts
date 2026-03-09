// Sage Green brand palette — aligned with src/theme/tokens
export const colors = {
  light: {
    primary: '#8DA399',
    primaryLight: '#a8beb6',
    primaryDark: '#6d8a82',
    secondary: '#D4AF37',
    secondaryLight: '#e5c968',
    secondaryDark: '#b8942a',
    accentSecondary: '#C27C62',

    background: '#FAF9F6',
    surface: '#f5f4f0',
    surfaceVariant: '#efeeea',

    text: '#333333',
    textSecondary: '#555555',
    textTertiary: '#777777',

    border: '#e6e5e1',
    borderLight: '#f0efeb',

    error: '#dc2626',
    errorLight: '#fee2e2',
    success: '#D4AF37',
    successLight: '#f5e6c4',
    warning: '#C27C62',
    warningLight: '#f0ddd6',
    info: '#3b82f6',
    infoLight: '#dbeafe',

    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    primary: '#8DA399',
    primaryLight: '#a8beb6',
    primaryDark: '#6d8a82',
    secondary: '#D4AF37',
    secondaryLight: '#e5c968',
    secondaryDark: '#b8942a',
    accentSecondary: '#C27C62',

    background: '#1a1b18',
    surface: '#232520',
    surfaceVariant: '#2d2e2a',

    text: '#f5f5f3',
    textSecondary: '#c8c8c4',
    textTertiary: '#9a9a95',

    border: '#3a3b36',
    borderLight: '#2d2e2a',

    error: '#ef4444',
    errorLight: '#7f1d1d',
    success: '#D4AF37',
    successLight: '#5c4a1a',
    warning: '#C27C62',
    warningLight: '#4a2e26',
    info: '#60a5fa',
    infoLight: '#1e3a8a',

    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export type ColorScheme = 'light' | 'dark';
export type Colors = typeof colors.light;














