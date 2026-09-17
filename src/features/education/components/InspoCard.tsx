import { StyleSheet, View } from 'react-native';
import { BookmarkPlus, Play } from 'lucide-react-native';
import { makeStyles, radius, space } from '@/shared/theme';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { feedAspectRatio } from '../content';
import type { Content } from '../types';

export interface InspoCardProps {
  content: Content;
  onPress: (content: Content) => void;
  onSave: (content: Content) => void;
}

const useStyles = makeStyles(() => ({
  card: { paddingHorizontal: space.xs + 1, paddingBottom: space.lg },
  media: { overflow: 'hidden', borderRadius: radius.lg },
  badge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,8,10,0.44)',
  },
  save: { position: 'absolute', bottom: space.sm, right: space.sm },
  title: { marginTop: space.sm, marginHorizontal: space.xxs },
}));

/** A masonry feed card. Handlers take the item, so the list can pass stable callbacks. */
export function InspoCard({ content, onPress, onSave }: InspoCardProps) {
  const styles = useStyles();

  return (
    <PressableScale
      onPress={() => onPress(content)}
      scaleTo={0.98}
      accessibilityLabel={content.title}
      style={styles.card}
    >
      <View style={[styles.media, { aspectRatio: 1 / feedAspectRatio(content.id) }]}>
        <RemoteImage
          uri={content.thumbnailUri}
          style={StyleSheet.absoluteFill}
          recyclingKey={content.id}
        />
        {content.type === 'video' && (
          <View style={styles.badge} accessibilityLabel="Video">
            <Play size={12} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
          </View>
        )}
        <IconButton
          icon={BookmarkPlus}
          variant="overlay"
          size={32}
          accessibilityLabel="Save to a mood board"
          onPress={() => onSave(content)}
          style={styles.save}
        />
      </View>
      <Text variant="footnote" numberOfLines={2} style={styles.title}>
        {content.title}
      </Text>
    </PressableScale>
  );
}
