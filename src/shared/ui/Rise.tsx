import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { EASE_OUT } from '@/shared/theme';

export interface RiseProps {
  children: ReactNode;
  /** Position in a run: each one starts a beat after the last. */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

const DURATION = 240;
const STEP_MS = 45;
/** After this many, everything lands together — a long list shouldn't take a second. */
const MAX_STEPS = 6;

/**
 * Something arriving: up a few pixels and in, one after another when there are
 * several. The setup flow's entering animation, made reusable.
 *
 * Give it a `key` that changes and it plays again, which is how a value that has
 * just changed announces itself.
 *
 * Not for a virtualised row — a recycled cell would replay this on every scroll —
 * and not inside a native `Modal`, where the dialog drives shared values instead.
 */
export function Rise({ children, index = 0, style }: RiseProps) {
  const reduced = useReducedMotion();

  return (
    <Animated.View
      style={style}
      entering={
        reduced
          ? undefined
          : FadeInDown.duration(DURATION)
              .delay(Math.min(index, MAX_STEPS) * STEP_MS)
              .easing(EASE_OUT)
      }
    >
      {children}
    </Animated.View>
  );
}
