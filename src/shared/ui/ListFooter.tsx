import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { space, useTheme } from '@/shared/theme';

const styles = StyleSheet.create({
  footer: { height: 72, alignItems: 'center', justifyContent: 'center' },
});

/**
 * The bottom of an endless list. While there's more to come it holds a small
 * spinner, so scrolling fast never runs into blank space — the next page is
 * already on its way (lists ask for it two screens early).
 */
export function ListFooter({ more }: { more: boolean }) {
  const theme = useTheme();
  if (!more) return <View style={{ height: space.xl }} />;
  return (
    <View style={styles.footer}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}

/** How far ahead of the viewport an endless list renders and asks for more. */
export const FEED_LIST = {
  /** Pixels rendered beyond the viewport, above and below — about a screen and a half. */
  drawDistance: 1200,
  /** Ask for the next page this many screens before the end. */
  onEndReachedThreshold: 2,
} as const;
