import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { EASE_OUT, makeStyles, space, useTheme } from '@/shared/theme';
import { PressableScale } from './PressableScale';

export interface StarRatingProps {
  /** 0 for not rated yet. */
  value: number;
  /** Given, the stars can be tapped. Without it they only show a rating. */
  onChange?: (value: number) => void;
  size?: number;
  testID?: string;
}

const STARS = [1, 2, 3, 4, 5];

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center' },
}));

/** Five stars. Read-only by default; tappable, and adjustable by screen readers, with `onChange`. */
export function StarRating({ value, onChange, size = 16, testID }: StarRatingProps) {
  const styles = useStyles();
  const label = value ? `${value} out of 5 stars` : 'Not rated';

  if (!onChange) {
    return (
      <View
        style={[styles.row, { gap: 1 }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        testID={testID}
      >
        {STARS.map(n => (
          <StarGlyph key={n} filled={n <= value} size={size} />
        ))}
      </View>
    );
  }

  return (
    <View
      style={[styles.row, { gap: space.xs }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Rating"
      accessibilityValue={{ min: 0, max: 5, now: value, text: label }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event =>
        onChange(
          Math.min(5, Math.max(1, value + (event.nativeEvent.actionName === 'increment' ? 1 : -1)))
        )
      }
      testID={testID}
    >
      {STARS.map(n => (
        <PressableScale
          key={n}
          onPress={() => onChange(n)}
          haptic="selection"
          scaleTo={0.9}
          hitSlop={4}
          importantForAccessibility="no"
          testID={testID ? `${testID}-${n}` : undefined}
        >
          <StarGlyph filled={n <= value} size={size} index={n - 1} />
        </PressableScale>
      ))}
    </View>
  );
}

function StarGlyph({ filled, size, index }: { filled: boolean; size: number; index?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const was = useRef(filled);

  useEffect(() => {
    // Stars fill left to right a beat apart, so a rating lands rather than flips.
    if (index !== undefined && filled && !was.current && !reduced) {
      scale.set(
        withDelay(
          index * 35,
          withSequence(
            withTiming(1.25, { duration: 110, easing: EASE_OUT }),
            withSpring(1, { duration: 320, dampingRatio: 0.55 })
          )
        )
      );
    }
    was.current = filled;
  }, [filled, index, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={style}>
      <Star
        size={size}
        color={filled ? theme.colors.gold : theme.colors.text.tertiary}
        fill={filled ? theme.colors.gold : 'transparent'}
        strokeWidth={filled ? 1.5 : 1.8}
      />
    </Animated.View>
  );
}
