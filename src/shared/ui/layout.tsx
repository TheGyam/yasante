import { createContext, useContext, type ReactNode } from 'react';
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

const TabBarContext = createContext(false);

/**
 * Wraps a tabs navigator. The floating bar sits over every screen in that group —
 * the tab roots and everything pushed on top of them — so clearing it is a fact
 * about where a screen lives, not a prop each screen has to remember to pass.
 */
export function TabBarProvider({ children }: { children: ReactNode }) {
  return <TabBarContext.Provider value={true}>{children}</TabBarContext.Provider>;
}

/** True inside a tabs group. Root-stack screens and modals cover the bar, so false. */
export const useHasTabBar = () => useContext(TabBarContext);

/**
 * Padding a scrolling screen needs so content clears the header and, where there is
 * one, the floating tab bar. For screens that own their own list.
 */
export function useContentInsets({ header = true, modal = false } = {}) {
  const insets = useSafeAreaInsets();
  const hasTabBar = useHasTabBar();
  return {
    top: sheetTop(insets.top, modal) + (header ? HEADER_HEIGHT : space.lg),
    bottom: hasTabBar
      ? tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + space.xl
      : insets.bottom + space.xxl,
  };
}
