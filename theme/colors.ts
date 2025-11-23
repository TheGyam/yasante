export const colors = {
  light: {
    primary: '#5e1d31',
    primaryLight: '#7d2a45',
    primaryDark: '#4a1626',
    secondary: '#d4a574',
    secondaryLight: '#e5c19a',
    secondaryDark: '#b8905a',
    
    background: '#ffffff',
    surface: '#f8f9fa',
    surfaceVariant: '#f0f1f3',
    
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    
    error: '#ef4444',
    errorLight: '#fee2e2',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    info: '#3b82f6',
    infoLight: '#dbeafe',
    
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    primary: '#7d2a45',
    primaryLight: '#9a3a5a',
    primaryDark: '#5e1d31',
    secondary: '#d4a574',
    secondaryLight: '#e5c19a',
    secondaryDark: '#b8905a',
    
    background: '#0f0f0f',
    surface: '#1a1a1a',
    surfaceVariant: '#252525',
    
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
    
    border: '#374151',
    borderLight: '#4b5563',
    
    error: '#f87171',
    errorLight: '#7f1d1d',
    success: '#34d399',
    successLight: '#064e3b',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    infoLight: '#1e3a8a',
    
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export type ColorScheme = 'light' | 'dark';
export type Colors = typeof colors.light;














