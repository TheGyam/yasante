import { ScrollView, View } from 'react-native';
import { GUTTER, makeStyles, space } from '@/shared/theme';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import type { Content } from '../types';
import { ContentTile } from './ContentTile';

export interface ContentCarouselProps {
  title: string;
  items: readonly Content[];
  onPress: (content: Content) => void;
  actionLabel?: string;
  onAction?: () => void;
  tileWidth?: number;
}

const useStyles = makeStyles(() => ({
  // Bleeds to the screen edges so tiles scroll out of view, not into the gutter.
  scroller: { marginHorizontal: -GUTTER },
  content: { paddingHorizontal: GUTTER, gap: space.md },
}));

/** A titled, snapping row of content tiles. Renders nothing when empty. */
export function ContentCarousel({
  title,
  items,
  onPress,
  actionLabel,
  onAction,
  tileWidth = 200,
}: ContentCarouselProps) {
  const styles = useStyles();
  if (items.length === 0) return null;

  return (
    <View>
      <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.content}
        decelerationRate="fast"
        snapToInterval={tileWidth + space.md}
      >
        {items.map(item => (
          <ContentTile key={item.id} content={item} onPress={onPress} width={tileWidth} />
        ))}
      </ScrollView>
    </View>
  );
}
