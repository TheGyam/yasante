import { StyleSheet, View } from 'react-native';
import { radius, space } from '@/shared/theme';
import { ListFooter } from '@/shared/ui/ListFooter';
import { Skeleton } from '@/shared/ui/Skeleton';

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: space.sm + 2 },
  column: { flex: 1, gap: space.sm + 2 },
  // Under the grid's own tiles, which carry a small inset of their own.
  footer: { marginHorizontal: space.xs + 1, marginTop: space.sm + 2 },
  end: { height: space.xl },
});

/** The grid's shape while its first looks are on the way: home's feed, More like this. */
export function LooksSkeleton() {
  return (
    <View style={styles.grid}>
      <View style={styles.column}>
        <Skeleton height={230} radius={radius.lg} />
        <Skeleton height={180} radius={radius.lg} />
      </View>
      <View style={styles.column}>
        <Skeleton height={180} radius={radius.lg} />
        <Skeleton height={240} radius={radius.lg} />
      </View>
    </View>
  );
}

/**
 * The bottom of an endless grid of looks. While the next ones are being fetched it
 * shows their shape, as Pinterest does, so scrolling faster than they arrive never
 * runs into blank space. Only then: the tiles pulse, and kept mounted under the
 * grid they redrew the screen ~45 times a second, unseen, for as long as she stayed.
 */
export function LooksFooter({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  /** The next page failed: say so and offer it again, rather than the list just stopping. */
  error?: unknown;
  onRetry?: () => void;
}) {
  if (!loading && error && onRetry) return <ListFooter error={error} onRetry={onRetry} />;
  if (!loading) return <View style={styles.end} />;
  return (
    <View style={styles.footer} accessibilityLabel="Loading more looks">
      <LooksSkeleton />
    </View>
  );
}
