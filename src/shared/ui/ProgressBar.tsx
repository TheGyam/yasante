import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { makeStyles, radius, timing } from '@/shared/theme';

export interface ProgressBarProps {
  /** 0 to 1. */
  progress: number;
  height?: number;
  tone?: 'accent' | 'success' | 'gold' | 'danger';
}

const useStyles = makeStyles(t => ({
  track: {
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: t.colors.glass.fillStrong,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  accent: { backgroundColor: t.colors.accent },
  success: { backgroundColor: t.colors.success },
  gold: { backgroundColor: t.colors.gold },
  danger: { backgroundColor: t.colors.danger },
}));

/**
 * The fill is absolutely positioned with no children, so animating its width costs
 * no layout for anything else — and keeps its rounded ends, which scaleX would smear.
 */
export function ProgressBar({ progress, height = 6, tone = 'accent' }: ProgressBarProps) {
  const styles = useStyles();
  const clamped = Math.min(1, Math.max(0, progress));
  const value = useSharedValue(clamped);

  useEffect(() => {
    value.set(withTiming(clamped, timing.move));
  }, [clamped, value]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));

  return (
    <View
      style={[styles.track, { height }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View style={[styles.fill, styles[tone], fillStyle]} />
    </View>
  );
}
