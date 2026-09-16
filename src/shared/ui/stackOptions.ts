import { useReducedMotion } from 'react-native-reanimated';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { darkTheme, lightTheme, useTheme, type Theme } from '@/shared/theme';

function build(theme: Theme, reduced: boolean): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: theme.colors.bg },
    // The platform's own push and back gesture — or a fade when motion is reduced.
    animation: reduced ? 'fade' : 'default',
  };
}

// Built once: navigators receive the same object until the scheme or motion setting changes.
const OPTIONS = {
  dark: { full: build(darkTheme, false), reduced: build(darkTheme, true) },
  light: { full: build(lightTheme, false), reduced: build(lightTheme, true) },
} as const;

/** Screen options shared by every stack in the app. */
export function useStackOptions(): NativeStackNavigationOptions {
  const theme = useTheme();
  const reduced = useReducedMotion();
  return OPTIONS[theme.scheme][reduced ? 'reduced' : 'full'];
}
