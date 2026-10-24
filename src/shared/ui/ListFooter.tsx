import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { errorMessage, isConnectionProblem } from '@/shared/lib/errors';
import { space, useTheme } from '@/shared/theme';
import { Button } from './Button';
import { Text } from './Text';

const styles = StyleSheet.create({
  footer: { height: 72, alignItems: 'center', justifyContent: 'center' },
  failed: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
  },
});

/**
 * The bottom of an endless list. While there's more to come it holds a small
 * spinner, so scrolling fast never runs into blank space — the next page is
 * already on its way (lists ask for it two screens early).
 */
export function ListFooter({
  more = false,
  error,
  onRetry,
}: {
  more?: boolean;
  /** The next page didn't come: said so, with a way to ask again, so the list never just stops. */
  error?: unknown;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  if (error && onRetry) {
    return (
      <View style={styles.failed} accessibilityRole="alert">
        <Text variant="footnote" tone="secondary" align="center">
          {isConnectionProblem(error)
            ? 'Couldn’t load more. You seem to be offline.'
            : errorMessage(error, 'Couldn’t load more.')}
        </Text>
        <Button label="Try again" size="sm" variant="secondary" onPress={onRetry} />
      </View>
    );
  }
  if (!more) return <View style={{ height: space.xl }} />;
  return (
    <View style={styles.footer}>
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}

/** How far ahead of the viewport an endless list renders and asks for more. */
export const FEED_LIST = {
  /** Pixels rendered beyond the viewport, above and below — under a screen. More meant
   *  each flick swapped in a big batch of tiles at once, which stuttered on Android;
   *  photos for what's next are prefetched anyway. */
  drawDistance: 600,
  /** Ask for the next page this many screens before the end. */
  onEndReachedThreshold: 2,
} as const;
