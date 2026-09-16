import React from 'react';
import { render, RenderOptions, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/shared/legacy/theme/ThemeProvider';

/**
 * Render with the app's providers in place.
 *
 * Styled components read the theme from context, not from the useTheme hook, so
 * mocking the hook alone leaves every styled component without a theme.
 *
 * ThemeProvider renders nothing until it has read the stored scheme, so this waits
 * for the first paint before handing the result back.
 */
export async function renderWithTheme(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const result = render(<ThemeProvider>{ui}</ThemeProvider>, options);
  await waitFor(() => expect(result.toJSON()).not.toBeNull());
  return result;
}

export * from '@testing-library/react-native';
