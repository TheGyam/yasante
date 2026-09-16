import { Easing, ReduceMotion } from 'react-native-reanimated';

/** Strong ease-out: entering, leaving, press feedback. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Something moving across the screen. */
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

const reduceMotion = ReduceMotion.System;

/** Timing configs — for motion no finger is driving. */
export const timing = {
  pressIn: { duration: 120, easing: EASE_OUT, reduceMotion },
  pressOut: { duration: 180, easing: EASE_OUT, reduceMotion },
  state: { duration: 180, easing: EASE_OUT, reduceMotion },
  move: { duration: 250, easing: EASE_IN_OUT, reduceMotion },
  enter: { duration: 250, easing: EASE_OUT, reduceMotion },
} as const;

/** Spring configs — for anything a finger started. Apple's duration/damping form. */
export const spring = {
  settle: { duration: 400, dampingRatio: 1, reduceMotion },
  snap: { duration: 400, dampingRatio: 0.8, reduceMotion },
  sheet: { duration: 300, dampingRatio: 0.8, reduceMotion },
} as const;
