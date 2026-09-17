import { StyleSheet, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { makeStyles, radius, space } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { TOPIC_LABELS } from '../content';
import type { Content } from '../types';

export interface ContentTileProps {
  content: Content;
  onPress: (content: Content) => void;
  width?: number;
}

const useStyles = makeStyles(() => ({
  tile: { gap: space.sm },
  media: { aspectRatio: 4 / 5, overflow: 'hidden', borderRadius: radius.lg },
  play: {
    position: 'absolute',
    bottom: space.sm,
    left: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,8,10,0.5)',
  },
  playText: { color: '#FFFFFF' },
  text: { gap: 2 },
}));

function meta(content: Content) {
  if (content.type === 'video') return content.duration ? `${content.duration} min` : 'Video';
  return content.duration ? `${content.duration} min read` : 'Article';
}

/** A card for horizontal carousels of articles and videos. */
export function ContentTile({ content, onPress, width = 200 }: ContentTileProps) {
  const styles = useStyles();

  return (
    <PressableScale
      onPress={() => onPress(content)}
      scaleTo={0.98}
      accessibilityLabel={`${content.title}, ${meta(content)}`}
      style={[styles.tile, { width }]}
    >
      <View style={styles.media}>
        <RemoteImage
          uri={content.thumbnailUri}
          style={StyleSheet.absoluteFill}
          recyclingKey={content.id}
        />
        {content.type === 'video' && (
          <View style={styles.play}>
            <Play size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
            <Text variant="caption" style={styles.playText}>
              {meta(content)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.text}>
        <Text variant="overline" tone="tertiary" numberOfLines={1}>
          {TOPIC_LABELS[content.topic] ?? content.topic}
        </Text>
        <Text variant="callout" numberOfLines={2}>
          {content.title}
        </Text>
        {content.type !== 'video' && (
          <Text variant="footnote" tone="secondary">
            {meta(content)}
          </Text>
        )}
      </View>
    </PressableScale>
  );
}
