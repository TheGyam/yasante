import { StyleSheet } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import {
  ThemeProvider,
  darkTheme,
  lightTheme,
  makeStyles,
  useThemePreference,
} from '@/shared/theme';

const useStyles = makeStyles(t => ({ box: { backgroundColor: t.colors.bg } }));

const seen: ReturnType<typeof useStyles>[] = [];
function Probe() {
  seen.push(useStyles());
  return null;
}

beforeEach(() => {
  seen.length = 0;
  useThemePreference.setState({ preference: 'dark' });
});

describe('makeStyles', () => {
  it('returns the same styles object across renders, so memoised children stay put', async () => {
    const view = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    view.rerender(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await waitFor(() => expect(seen.length).toBeGreaterThanOrEqual(2));
    expect(seen[seen.length - 1]).toBe(seen[0]);
    expect(StyleSheet.flatten(seen[0].box).backgroundColor).toBe(darkTheme.colors.bg);
  });

  it('switches to the other scheme when the preference changes', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    await act(async () => useThemePreference.setState({ preference: 'light' }));

    await waitFor(() =>
      expect(StyleSheet.flatten(seen[seen.length - 1].box).backgroundColor).toBe(
        lightTheme.colors.bg
      )
    );
  });
});
