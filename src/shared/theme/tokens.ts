/**
 * Design Tokens for Yasante App
 * All design values are centralized here for easy theming and brand updates
 */

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export const radii = {
  small: 8,
  medium: 14,
  large: 24,
  round: 9999,
} as const;

export const fontSizes = {
  0: 12,
  1: 14,
  2: 16,
  3: 18,
  4: 22,
  5: 28,
  6: 34,
} as const;

export const lineHeights = {
  0: 16,
  1: 20,
  2: 24,
  3: 28,
  4: 32,
  5: 36,
  6: 40,
} as const;

export const fontFamily = {
  regular: 'Lato_400Regular',
  medium: 'Lato_400Regular',
  semibold: 'Lato_700Bold',
  bold: 'Lato_700Bold',
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const iconSizes = {
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 48,
} as const;

export const breakpoints = {
  smallPhone: 320,
  phone: 375,
  largePhone: 414,
  tablet: 768,
} as const;

// Elevation shadows for iOS and Android
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// Color palette — Sage Green brand
export const colors = {
  // Primary (Sage Green) — buttons, headers, active states, progress rings
  primary: '#8DA399',
  primaryVariant: '#6d8a82',
  primaryLight: '#a8beb6',

  // Accent (Burnished Copper) — Premium badges, streaks, success icons
  accent: '#C07850',
  accentLight: '#d18a66',
  accentDark: '#a1603a',

  // Secondary accent (Terracotta) — alerts, warmth (sparingly)
  accentSecondary: '#C4704A',

  // Light theme — Cream/Bone background, Slate Grey text
  light: {
    background: '#F5F0EB',
    surface: '#FFFFFF',
    surfaceVariant: '#f0ece7',
    border: '#333333',
    borderLight: '#f0efeb',
    text: {
      high: '#333333',
      medium: '#555555',
      low: '#777777',
      disabled: '#9a9a95',
    },
    error: '#dc2626',
    success: '#D4AF37',
    warning: '#C27C62',
    info: '#2563eb',
  },

  // Dark theme — warm dark background
  dark: {
    background: '#1a1b18',
    surface: '#232520',
    surfaceVariant: '#2d2e2a',
    border: '#3a3b36',
    borderLight: '#2d2e2a',
    text: {
      high: '#f5f5f3',
      medium: '#c8c8c4',
      low: '#9a9a95',
      disabled: '#6b6b67',
    },
    error: '#ef4444',
    success: '#D4AF37',
    warning: '#C27C62',
    info: '#3b82f6',
  },
} as const;

export type Spacing = typeof spacing;
export type Radii = typeof radii;
export type FontSizes = typeof fontSizes;
export type Colors = typeof colors;
export type Shadows = typeof shadows;

