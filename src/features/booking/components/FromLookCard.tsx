import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { makeStyles, radius, space } from '@/shared/theme';
import { Tilt } from '@/shared/ui/Motion';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import type { Booking } from '../types';

const useStyles = makeStyles(t => ({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
  },
  photo: { width: '100%' },
  caption: { padding: space.lg, gap: 2 },
}));

/**
 * The look a request was made from: the exact picture, so there's no guessing what
 * "knotless, mid-back" means to her. Tilts under a finger; opens the look.
 */
export function FromLookCard({
  look,
  title,
}: {
  look: NonNullable<Booking['fromLook']>;
  title: string;
}) {
  const styles = useStyles();
  const router = useRouter();
  // Tall photos are capped so the request's details stay in reach.
  const aspect = Math.max(look.photoAspect ?? 0.8, 0.75);
  return (
    <Tilt
      style={styles.card}
      maxTilt={5}
      onPress={() => router.push(`/looks/${look.id}`)}
      accessibilityLabel={`${title}. Opens the look`}
      testID="from-look"
    >
      <RemoteImage
        uri={look.feedUri ?? look.photoUri}
        placeholderUri={look.thumbUri}
        style={[styles.photo, { aspectRatio: aspect }]}
      />
      <View style={styles.caption}>
        <Text variant="overline" tone="tertiary">
          {title}
        </Text>
        {!!look.caption && (
          <Text variant="callout" numberOfLines={2}>
            {look.caption}
          </Text>
        )}
        {!!look.authorName && (
          <Text variant="footnote" tone="secondary">
            Posted by {look.authorName}
          </Text>
        )}
      </View>
    </Tilt>
  );
}
