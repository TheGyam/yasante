import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GalleryHorizontalEnd } from 'lucide-react-native';
import { fonts, radius } from '@/shared/theme';
import { Text } from './Text';

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,8,10,0.6)',
  },
  count: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
});

/**
 * On a photo with more behind it: a card sliding in from the side, and how many there
 * are, so it reads as "swipe for more" at a glance. Decorative: the photo's own label
 * says the count to a screen reader.
 */
export function PhotoCount({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.pill, style]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <GalleryHorizontalEnd size={13} color="#FFFFFF" strokeWidth={2.4} />
      <Text style={styles.count} maxFontSizeMultiplier={1.2}>
        {count}
      </Text>
    </View>
  );
}
