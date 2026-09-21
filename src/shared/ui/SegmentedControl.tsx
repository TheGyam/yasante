import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { makeStyles, radius, space, timing } from '@/shared/theme';
import { haptics } from '@/shared/lib/haptics';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const PAD = 3;

const useStyles = makeStyles(t => ({
  track: {
    flexDirection: 'row',
    minHeight: 40,
    padding: PAD,
    borderRadius: radius.pill,
    backgroundColor: t.colors.glass.fill,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: t.colors.glass.fillStrong,
    borderWidth: 1,
    borderColor: t.colors.glass.border,
    borderTopColor: t.colors.glass.highlight,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
}));

/**
 * Segments are equal width, so the indicator only ever translates — one measurement
 * on layout, then transforms on the UI thread.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const styles = useStyles();
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);
  const placed = useRef(false);

  const index = Math.max(
    0,
    options.findIndex(o => o.value === value)
  );
  const segmentWidth = trackWidth > 0 ? (trackWidth - PAD * 2) / options.length : 0;

  useEffect(() => {
    if (!segmentWidth) return;
    const target = index * segmentWidth;
    if (placed.current) {
      x.set(withTiming(target, timing.move));
    } else {
      // First placement lands without sliding in from the left.
      x.set(target);
      placed.current = true;
    }
  }, [index, segmentWidth, x]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  const handleLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.track} onLayout={handleLayout} accessibilityRole="tablist">
      {segmentWidth > 0 && (
        <Animated.View style={[styles.indicator, { width: segmentWidth }, indicatorStyle]} />
      )}
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
          >
            <Text variant="callout" tone={selected ? 'primary' : 'secondary'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
