import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Heart } from 'lucide-react-native';
import { haptics } from '@/shared/lib/haptics';
import { EASE_OUT } from '@/shared/theme';
import type { Look } from '../types';

/** Two taps closer together than this are one double tap. */
const DOUBLE_TAP_MS = 280;

const styles = StyleSheet.create({
  burst: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

/**
 * One tap opens a look, two like it, with a heart bursting over the photo. The
 * first tap waits a beat to see if a second follows — the same wait a double-tap
 * recogniser has, written out so it behaves identically on every platform.
 */
export function usePhotoTaps(
  look: Look,
  onOpen: ((look: Look) => void) | undefined,
  onLike: (look: Look, liked: boolean) => void,
  heartSize = 96
) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  const pendingOpen = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTapAt = useRef(0);
  useEffect(() => () => clearTimeout(pendingOpen.current), []);

  const burst = () => {
    if (!reduced) {
      scale.set(
        withSequence(
          withTiming(0.6, { duration: 0 }),
          withSpring(1, { duration: 380, dampingRatio: 0.55 }),
          withTiming(1.1, { duration: 220, easing: EASE_OUT })
        )
      );
    }
    opacity.set(
      withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(1, { duration: 420 }),
        withTiming(0, { duration: 200, easing: EASE_OUT })
      )
    );
  };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      clearTimeout(pendingOpen.current);
      burst();
      haptics.light();
      // A double tap only ever likes. Taking a like back is a deliberate tap on the heart.
      if (!look.liked) onLike(look, true);
      return;
    }
    lastTapAt.current = now;
    if (onOpen) pendingOpen.current = setTimeout(() => onOpen(look), DOUBLE_TAP_MS);
  };

  const gesture = Gesture.Tap().onEnd((_e, success) => {
    if (success) scheduleOnRN(onTap);
  });

  // The heart itself, laid over the photo; it never takes a touch.
  const heart = (
    <Animated.View pointerEvents="none" style={[styles.burst, style]}>
      <Heart size={heartSize} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.2} />
    </Animated.View>
  );

  return { gesture, heart };
}
