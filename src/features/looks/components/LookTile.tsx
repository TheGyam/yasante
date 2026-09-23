import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { BookmarkPlus } from 'lucide-react-native';
import { formatMoney } from '@/shared/lib/format';
import { makeStyles, radius, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { IconButton } from '@/shared/ui/IconButton';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import type { Look } from '../types';
import { LikeButton } from './LikeButton';
import { usePhotoTaps } from './usePhotoTaps';

export interface LookTileProps {
  look: Look;
  onOpen: (look: Look) => void;
  onLike: (look: Look, liked: boolean) => void;
  /** Absent for her own looks. */
  onSave?: (look: Look) => void;
  /** Faded while newer results load. */
  dimmed?: boolean;
}

// A mix of heights so the grid reads as a wall of photos, not a spreadsheet. The
// server's photo dimensions win when it sends them.
const RATIOS = [1.25, 1.4, 1.1, 1.33, 1.5, 1.2];
function heightRatio(look: Look) {
  if (look.photoAspect) return Math.min(1.6, Math.max(0.9, 1 / look.photoAspect));
  let hash = 0;
  for (let i = 0; i < look.id.length; i++) hash = (hash * 31 + look.id.charCodeAt(i)) | 0;
  return RATIOS[Math.abs(hash) % RATIOS.length];
}

const useStyles = makeStyles(t => ({
  tile: { paddingHorizontal: space.xs + 1, paddingBottom: space.lg },
  dimmed: { opacity: 0.45 },
  media: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: t.colors.glass.fillStrong,
  },
  price: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,8,10,0.55)',
  },
  priceText: { color: '#FFFFFF' },
  save: { position: 'absolute', right: space.sm, bottom: space.sm },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
    marginHorizontal: space.xxs,
  },
  name: { flex: 1 },
}));

/**
 * A look in the home grid: the photo, who posted it, and the heart. One tap opens
 * it — comments, booking and the rest — and a double tap likes it.
 */
export const LookTile = memo(function LookTile({
  look,
  onOpen,
  onLike,
  onSave,
  dimmed,
}: LookTileProps) {
  const styles = useStyles();
  const { gesture, heart } = usePhotoTaps(look, onOpen, onLike, 64);
  const price = look.price
    ? `${look.fromPrice ? 'from ' : ''}${formatMoney(look.price)}`
    : undefined;

  return (
    <View style={[styles.tile, dimmed && styles.dimmed]}>
      <View style={[styles.media, { aspectRatio: 1 / heightRatio(look) }]}>
        {/* Only the photo takes taps: the save button over it is a sibling. */}
        <GestureDetector gesture={gesture}>
          <View
            style={StyleSheet.absoluteFill}
            accessible
            accessibilityRole="button"
            accessibilityLabel={[
              look.caption ?? look.serviceName ?? 'A look',
              `by ${look.authorName}`,
            ]
              .filter(Boolean)
              .join(', ')}
            accessibilityHint="Opens the look. Double tap to like"
          >
            {/* The grid's copy: half the width, a fraction of the bytes. */}
            <RemoteImage
              uri={look.thumbUri ?? look.photoUri}
              style={StyleSheet.absoluteFill}
              recyclingKey={look.id}
            />
            {heart}
          </View>
        </GestureDetector>
        {!!price && (
          <View style={styles.price} pointerEvents="none">
            <Text variant="caption" style={styles.priceText}>
              {price}
            </Text>
          </View>
        )}
        {onSave && (
          <IconButton
            icon={BookmarkPlus}
            variant="overlay"
            size={30}
            accessibilityLabel="Save to a collection"
            onPress={() => onSave(look)}
            style={styles.save}
          />
        )}
      </View>
      <View style={styles.meta}>
        <Avatar uri={look.authorAvatarUri} name={look.authorName} size={20} />
        <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.name}>
          {look.authorName}
        </Text>
        <LikeButton
          id={look.id}
          liked={look.liked}
          count={look.likeCount}
          size={16}
          onToggle={() => onLike(look, !look.liked)}
        />
      </View>
    </View>
  );
});
