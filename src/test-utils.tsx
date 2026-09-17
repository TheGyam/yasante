import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/shared/theme';

/** Render with the app's theme in place. */
export function renderWithTheme(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(<ThemeProvider>{ui}</ThemeProvider>, options);
}

export * from '@testing-library/react-native';
