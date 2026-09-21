import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import { EASE_OUT, makeStyles, space, useTheme } from '@/shared/theme';
import { PressableScale } from '@/shared/ui/PressableScale';
import { Text } from '@/shared/ui/Text';

export interface LikeButtonProps {
  /** The look. A recycled row shows a new one; that must never read as a fresh like. */
  id: string;
  liked: boolean;
  count: number;
  onToggle: () => void;
  /** The heart's size; smaller in the home grid. */
  size?: number;
}

const useStyles = makeStyles(() => ({
  button: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 36 },
}));

/**
 * The heart pops when it fills — only then, and only when she caused it. Unliking
 * is quiet: taking something back shouldn't celebrate.
 */
export function LikeButton({ id, liked, count, onToggle, size = 22 }: LikeButtonProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const was = useRef({ id, liked });

  useEffect(() => {
    if (liked && !was.current.liked && was.current.id === id && !reduced) {
      scale.set(
        withSequence(
          withTiming(1.3, { duration: 120, easing: EASE_OUT }),
          withSpring(1, { duration: 360, dampingRatio: 0.5 })
        )
      );
    }
    was.current = { id, liked };
  }, [id, liked, reduced, scale]);

  const heart = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const color = liked ? theme.colors.accent : theme.colors.text.secondary;

  return (
    <PressableScale
      onPress={onToggle}
      haptic={liked ? undefined : 'light'}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityState={{ selected: liked }}
      accessibilityLabel={`${liked ? 'Unlike' : 'Like'}, ${count} ${count === 1 ? 'like' : 'likes'}`}
      style={styles.button}
    >
      <Animated.View style={heart}>
        <Heart size={size} color={color} fill={liked ? color : 'transparent'} strokeWidth={2} />
      </Animated.View>
      {count > 0 && (
        <Text
          variant={size < 20 ? 'caption' : 'callout'}
          style={{ color, fontVariant: ['tabular-nums'] }}
        >
          {count}
        </Text>
      )}
    </PressableScale>
  );
}
