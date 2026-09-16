import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { EASE_IN_OUT, makeStyles, radius as radii } from '@/shared/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const useStyles = makeStyles(t => ({
  base: { backgroundColor: t.colors.glass.fillStrong },
}));

/** A loading placeholder that breathes. Static under reduced motion. */
export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    pulse.set(withRepeat(withTiming(0.45, { duration: 850, easing: EASE_IN_OUT }), -1, true));
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
}
