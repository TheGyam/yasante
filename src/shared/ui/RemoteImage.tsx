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

/** Cached network image on a quiet placeholder, fading in once decoded. */
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
      transition={180}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey}
      priority={priority}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
