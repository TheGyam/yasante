import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/shared/theme';

export const HEADER_HEIGHT = 52;
export const TAB_BAR_HEIGHT = 64;

/** Distance from the bottom edge to the floating tab bar. */
export function tabBarBottom(safeBottom: number) {
  return Math.max(safeBottom, space.md);
}

/**
 * An iOS modal is a sheet that starts below the status bar, so the notch inset doesn't
 * apply inside it. Android modals are full screen and keep it.
 */
export function sheetTop(safeTop: number, modal: boolean) {
  return modal && Platform.OS === 'ios' ? space.sm : safeTop;
}

/**
 * Padding a scrolling screen needs so content clears the header and, on tab roots,
 * the floating tab bar. For screens that own their own list.
 */
export function useContentInsets({ header = true, tabBar = false, modal = false } = {}) {
  const insets = useSafeAreaInsets();
  return {
    top: sheetTop(insets.top, modal) + (header ? HEADER_HEIGHT : space.lg),
    bottom: tabBar
      ? tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + space.xl
      : insets.bottom + space.xxl,
  };
}
