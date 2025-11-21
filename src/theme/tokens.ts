/**
 * Design Tokens for Kalon App
 * All design values are centralized here for easy theming and brand updates
 */

export const spacing = {
  0: 0,
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
  regular: 'DeliusSwashCaps-Regular',
  medium: 'DeliusSwashCaps-Regular',
  semibold: 'DeliusSwashCaps-Regular',
  bold: 'DeliusSwashCaps-Regular',
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

// Color palette
export const colors = {
  // Primary brand color
  primary: '#5e1d31',
  primaryVariant: '#4b1626',
  primaryLight: '#7a2a42',
  
  // Accent colors
  accent: '#f7c6d1',
  accentLight: '#fce4ea',
  accentDark: '#e8a4b5',
  
  // Light theme colors
  light: {
    background: '#ffffff',
    surface: '#f6f6f7',
    surfaceVariant: '#f0f0f1',
    border: '#e6e6e9',
    borderLight: '#f0f0f1',
    text: {
      high: '#111827',
      medium: '#374151',
      low: '#6b7280',
      disabled: '#9ca3af',
    },
    error: '#dc2626',
    success: '#16a34a',
    warning: '#ea580c',
    info: '#2563eb',
  },
  
  // Dark theme colors
  dark: {
    background: '#0b0b0c',
    surface: '#111214',
    surfaceVariant: '#1a1b1d',
    border: '#2a2b2e',
    borderLight: '#1a1b1d',
    text: {
      high: '#f8fafc',
      medium: '#cbd5e1',
      low: '#94a3b8',
      disabled: '#64748b',
    },
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f97316',
    info: '#3b82f6',
  },
} as const;

export type Spacing = typeof spacing;
export type Radii = typeof radii;
export type FontSizes = typeof fontSizes;
export type Colors = typeof colors;
export type Shadows = typeof shadows;

