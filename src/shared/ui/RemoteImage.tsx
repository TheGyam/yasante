import { Image, type ImageContentFit } from 'expo-image';
import type { StyleProp, ImageStyle } from 'react-native';
import { makeStyles } from '@/shared/theme';

export interface RemoteImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Set inside recycled lists so a reused cell never flashes the previous image. */
  recyclingKey?: string;
  accessibilityLabel?: string;
  priority?: 'low' | 'normal' | 'high';
}

const useStyles = makeStyles(t => ({
  base: { backgroundColor: t.colors.glass.fillStrong },
}));

/**
 * Cached network image on a quiet placeholder. Standalone images fade in once
 * decoded; inside a recycled list (a `recyclingKey`) they appear at once, because a
 * fade on every reused cell is what makes scrolling back up flash empty tiles.
 */
export function RemoteImage({
  uri,
  style,
  contentFit = 'cover',
  recyclingKey,
  accessibilityLabel,
  priority = 'normal',
}: RemoteImageProps) {
  const styles = useStyles();
  return (
    <Image
      source={uri ? { uri } : undefined}
      style={[styles.base, style]}
      contentFit={contentFit}
      transition={recyclingKey ? 0 : 180}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey}
      priority={priority}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/**
 * Warm the cache with images about to scroll into view, so they're decoded before
 * they're needed. Best effort: a miss just loads normally.
 */
export function prefetchImages(uris: (string | undefined)[]) {
  const list = uris.filter((u): u is string => !!u);
  if (list.length) Image.prefetch(list, 'memory-disk').catch(() => {});
}
