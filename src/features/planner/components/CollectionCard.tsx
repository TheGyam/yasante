import { StyleSheet, View } from 'react-native';
import { Lock, Images } from 'lucide-react-native';
import { makeStyles, radius, space, useTheme } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import type { Collection } from '../types';

export interface CollectionCardProps {
  collection: Collection;
  onPress: (collection: Collection) => void;
}

const useStyles = makeStyles(t => ({
  card: { flex: 1, gap: space.sm, paddingHorizontal: space.xs, paddingBottom: space.lg },
  cover: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: t.colors.glass.fillStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  name: { flex: 1 },
}));

const countLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;

export function CollectionCard({ collection, onPress }: CollectionCardProps) {
  const styles = useStyles();
  const theme = useTheme();

  return (
    <PressableScale
      onPress={() => onPress(collection)}
      scaleTo={0.98}
      accessibilityLabel={`${collection.name}, ${countLabel(collection.itemCount)}`}
      containerStyle={styles.card}
    >
      <View style={styles.cover}>
        {collection.coverUri ? (
          <RemoteImage
            uri={collection.coverUri}
            style={StyleSheet.absoluteFill}
            recyclingKey={collection.id}
          />
        ) : (
          <Images size={22} color={theme.colors.text.tertiary} strokeWidth={1.8} />
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
    </PressableScale>
  );
}
