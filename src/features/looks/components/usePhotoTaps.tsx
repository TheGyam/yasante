import { useEffect, useMemo, useRef } from 'react';
import { useRecyclingState } from '@shopify/flash-list';
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
 * The heart over the photo. Mounted only for the moment it plays, so a grid of a
 * hundred tiles carries no animation until someone double-taps one.
 */
function HeartBurst({ size, onDone }: { size: number; onDone: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  useEffect(() => {
    if (!reduced) {
      scale.set(
        withSequence(
          withSpring(1, { duration: 380, dampingRatio: 0.55 }),
          withTiming(1.1, { duration: 220, easing: EASE_OUT })
        )
      );
    }
    opacity.set(
      withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(1, { duration: 420 }),
        withTiming(0, { duration: 200, easing: EASE_OUT }, finished => {
          if (finished) scheduleOnRN(onDone);
        })
      )
    );
    // Plays once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View pointerEvents="none" style={[styles.burst, style]}>
      <Heart size={size} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.2} />
    </Animated.View>
  );
}

/**
 * In a feed (given `onOpen`), one tap opens the look at once. On the look's own page
 * two taps like it, with a heart bursting over the photo.
 *
 * Both on one photo would make every open wait a beat to see if a second tap follows:
 * 280ms before anything moved, the slowest part of opening a look. The feed has a
 * heart under each photo for liking, so its taps open straight away.
 */
export function usePhotoTaps(
  look: Look,
  onOpen: ((look: Look) => void) | undefined,
  onLike: (look: Look, liked: boolean) => void,
  heartSize = 96
) {
  // Which burst is playing; a new number restarts it on a quick second double tap.
  // Reset when a recycled tile shows another look, so a heart never jumps across.
  const [burst, setBurst] = useRecyclingState(0, [look.id]);
  const lastTapAt = useRef(0);

  const onTap = () => {
    if (onOpen) return onOpen(look);
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      setBurst(n => n + 1);
      haptics.light();
      // A double tap only ever likes. Taking a like back is a deliberate tap on the heart.
      if (!look.liked) onLike(look, true);
      return;
    }
    lastTapAt.current = now;
  };

  // Built once, calling the latest onTap: a new gesture each render makes the
  // detector re-attach on every like.
  const tap = useRef(onTap);
  tap.current = onTap;
  const gesture = useMemo(() => {
    const fire = () => tap.current();
    return Gesture.Tap().onEnd((_e, success) => {
      if (success) scheduleOnRN(fire);
    });
  }, []);

  const heart = burst ? (
    <HeartBurst key={burst} size={heartSize} onDone={() => setBurst(0)} />
  ) : null;

  return { gesture, heart };
}
