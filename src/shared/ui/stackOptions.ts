import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { darkTheme, lightTheme, useTheme, type Theme } from '@/shared/theme';

type Options = NativeStackNavigationOptions;

/**
 * How a screen arrives says where it sits:
 * - push: deeper in the same place — slides in from the edge, swipe back to leave.
 * - modal: a task on top — rises from the bottom, pull down or close to leave.
 * - fade: the same place, rearranged — search opening over its field, sign in and
 *   sign up swapping, the app appearing once you're in.
 * With reduced motion everything crossfades.
 */
function build(theme: Theme, reduced: boolean) {
  const push: Options = {
    headerShown: false,
    contentStyle: { backgroundColor: theme.colors.bg },
    // iOS keeps its native push and edge swipe; Android gets the same horizontal
    // movement instead of its generic zoom.
    animation: reduced ? 'fade' : Platform.OS === 'android' ? 'ios_from_right' : 'default',
  };
  const modal: Options = {
    presentation: 'modal',
    // Android's slide_from_bottom runs 400 ms at an even speed, which felt slow;
    // fade_from_bottom is Material's quicker rise (in ~210 ms, out ~150 ms, easing to
    // a stop). iOS keeps its native sheet, which is quick and follows the finger.
    animation: reduced ? 'fade' : Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
    gestureEnabled: true,
  };
  const fade: Options = { animation: 'fade', animationDuration: 220 };
  // Over the screen below, which stays visible: the screen animates itself in (a
  // look growing out of its tile in the feed).
  const overlay: Options = {
    presentation: 'transparentModal',
    animation: 'none',
    contentStyle: { backgroundColor: 'transparent' },
  };
  return { push, modal, fade, overlay };
}

// Built once per scheme and motion setting, so navigators always get the same objects.
const PRESETS = {
  dark: { full: build(darkTheme, false), reduced: build(darkTheme, true) },
  light: { full: build(lightTheme, false), reduced: build(lightTheme, true) },
} as const;

/** `push` is every stack's screenOptions; `modal`, `fade` and `overlay` are per-screen options. */
export function useStackPresets() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  return PRESETS[theme.scheme][reduced ? 'reduced' : 'full'];
}
