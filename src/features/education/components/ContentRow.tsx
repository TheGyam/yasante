import { View } from 'react-native';
import { makeStyles, radius, space } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
import { TOPIC_LABELS } from '../content';
import type { Content } from '../types';
import { SEP } from '@/shared/lib/format';

export interface ContentRowProps {
  content: Content;
  onPress: (content: Content) => void;
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  thumb: { width: 56, height: 70, borderRadius: radius.md },
  text: { flex: 1, gap: 2 },
}));

/** A compact list row for search results and saved items. */
export function ContentRow({ content, onPress }: ContentRowProps) {
  const styles = useStyles();
  const kind = content.type === 'video' ? 'Video' : 'Article';

  return (
    <PressableScale
      onPress={() => onPress(content)}
      scaleTo={0.98}
      accessibilityLabel={`${content.title}, ${kind}`}
      style={styles.row}
    >
      <RemoteImage uri={content.thumbnailUri} style={styles.thumb} recyclingKey={content.id} />
      <View style={styles.text}>
        <Text variant="overline" tone="tertiary" numberOfLines={1}>
          {TOPIC_LABELS[content.topic] ?? content.topic}
          {SEP}
          {kind}
        </Text>
        <Text variant="callout" numberOfLines={2}>
          {content.title}
        </Text>
      </View>
    </PressableScale>
  );
}
