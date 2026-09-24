import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Images, Lock } from 'lucide-react-native';
import { makeStyles, radius, space, spring, timing, useTheme } from '@/shared/theme';
import { Tilt } from '@/shared/ui/Motion';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { usePrefetchCollectionItems } from '../hooks';
import type { Collection } from '../types';

export interface CollectionCardProps {
  collection: Collection;
  onPress: (collection: Collection) => void;
}

const FRAME = 3;

/**
 * How each card in the deck sits, back to front. The front card is straight; the
 * ones behind lean alternately, like photos dropped in a pile.
 */
const FAN = [
  { rotate: -9, x: -9, y: 4 },
  { rotate: 7, x: 9, y: 2 },
  { rotate: -3.5, x: -3, y: 1 },
  { rotate: 0, x: 0, y: 0 },
];

const useStyles = makeStyles(t => ({
  card: { flex: 1, gap: space.sm, paddingHorizontal: space.xs, paddingBottom: space.lg },
  stage: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  photo: {
    position: 'absolute',
    width: '72%',
    aspectRatio: 0.8,
    // The white frame is the card's own background, and the picture rounds its own
    // corners: no clipping and no shadow. On rotated cards both are costly for Android
    // to redraw, and with twenty on screen they made the planner stutter on scroll.
    padding: FRAME,
    borderRadius: radius.md,
    backgroundColor: t.colors.text.primary,
  },
  picture: {
    flex: 1,
    borderRadius: radius.md - FRAME,
  },
  empty: {
    width: '72%',
    aspectRatio: 0.8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.glass.fillStrong,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  name: { flex: 1 },
}));

const countLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;

function DeckCard({
  uri,
  pose,
  spread,
  recyclingKey,
}: {
  uri: string;
  pose: (typeof FAN)[number];
  spread: SharedValue<number>;
  recyclingKey: string;
}) {
  const styles = useStyles();
  // Pressing fans the pile out a little further: all on the UI thread.
  const style = useAnimatedStyle(() => {
    const s = 1 + spread.get() * 0.6;
    return {
      transform: [
        { translateX: pose.x * s },
        { translateY: pose.y * s },
        { rotate: `${pose.rotate * s}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.photo, style]}>
      <RemoteImage uri={uri} style={styles.picture} recyclingKey={recyclingKey} />
    </Animated.View>
  );
}

/**
 * A collection as a small pile of its newest looks: one picture when it has one,
 * a fanned stack of up to four when it has more.
 */
export function CollectionCard({ collection, onPress }: CollectionCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const spread = useSharedValue(0);
  const prefetch = usePrefetchCollectionItems();
  const pictures = (
    collection.previewUris?.length
      ? collection.previewUris
      : collection.coverUri
        ? [collection.coverUri]
        : []
  ).slice(0, FAN.length);
  // Newest on top: draw the oldest first. Poses come from the front of the fan back.
  const deck = pictures.map((uri, i) => ({ uri, pose: FAN[FAN.length - 1 - i] })).reverse();

  return (
    <Tilt
      onPress={() => onPress(collection)}
      onPressIn={() => {
        prefetch(collection.id);
        if (!reduced) spread.set(withTiming(1, timing.pressIn));
      }}
      onPressOut={() => spread.set(withSpring(0, spring.snap))}
      maxTilt={6}
      accessibilityLabel={`${collection.name}, ${countLabel(collection.itemCount)}`}
      containerStyle={styles.card}
    >
      <View style={styles.stage}>
        {deck.length ? (
          deck.map(({ uri, pose }, i) => (
            <DeckCard
              key={`${uri}-${i}`}
              uri={uri}
              pose={pose}
              spread={spread}
              recyclingKey={`${collection.id}-${i}`}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Images size={22} color={theme.colors.text.tertiary} strokeWidth={1.8} />
          </View>
        )}
      </View>
      <View style={styles.meta}>
        {collection.isPrivate && (
          <Lock size={12} color={theme.colors.text.tertiary} strokeWidth={2.2} />
        )}
        <Text variant="footnote" numberOfLines={1} style={styles.name}>
          {collection.name}
        </Text>
      </View>
      <Text variant="caption" tone="tertiary">
        {countLabel(collection.itemCount)}
      </Text>
    </Tilt>
  );
}
