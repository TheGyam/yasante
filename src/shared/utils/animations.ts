import { Easing } from 'react-native-reanimated';

/**
 * Animation presets following professional animation guidelines:
 * - Speed: Quick but clear (200-300ms entry, 150-200ms exit)
 * - Clarity: Simple and coherent transitions
 * - Cohesion: Consistent motion throughout app
 * - Physics: Real-world physics with momentum
 * - Accessibility: Respect reduced motion preferences
 */

// Easing is evaluated at import time below, so anything importing this module dies
// with it. Reanimated ships no Easing in the Jest environment, so fall back to linear
// there rather than taking every component that animates down with it.
const identity = (t: number) => t;
const safeEasing: typeof Easing =
  Easing ??
  ({
    bezier: () => identity,
    linear: identity,
    quad: identity,
    cubic: identity,
    ease: identity,
    in: () => identity,
    out: () => identity,
    inOut: () => identity,
  } as unknown as typeof Easing);

const bezier = safeEasing.bezier;

// Standard easing curve: accelerates faster than it decelerates (asymmetrical)
export const standardEasing = bezier(0.4, 0.0, 0.2, 1.0);

// Deceleration curve: instant acceleration, smooth deceleration
export const decelerationEasing = bezier(0.0, 0.0, 0.2, 1.0);

// Acceleration curve: smooth acceleration, instant deceleration
export const accelerationEasing = bezier(0.4, 0.0, 1.0, 1.0);

// Sharp curve: quick transitions
export const sharpEasing = bezier(0.4, 0.0, 0.6, 1.0);

/**
 * Animation presets for different use cases
 */
export const ANIMATION_PRESETS = {
  // Entry animations (200-300ms)
  fadeIn: {
    duration: 250,
    easing: standardEasing,
  },
  slideIn: {
    duration: 250,
    easing: standardEasing,
  },
  scaleIn: {
    duration: 250,
    easing: standardEasing,
  },

  // Exit animations (150-200ms - shorter than entry)
  fadeOut: {
    duration: 180,
    easing: decelerationEasing,
  },
  slideOut: {
    duration: 180,
    easing: decelerationEasing,
  },
  scaleOut: {
    duration: 180,
    easing: decelerationEasing,
  },

  // Small elements / Desktop (150-200ms)
  icon: {
    duration: 180,
    easing: sharpEasing,
  },
  button: {
    duration: 200,
    easing: standardEasing,
  },

  // Spring animations (physics-based)
  springIn: {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  },
  springOut: {
    damping: 25,
    stiffness: 400,
    mass: 0.3,
  },

  // Loading indicators
  loading: {
    duration: 1000,
    easing: safeEasing.linear,
  },
} as const;

/**
 * Get animation config with reduced motion support
 */
export function getAnimationConfig(
  preset: { duration: number; easing: typeof standardEasing },
  reduceMotion: boolean
) {
  if (reduceMotion) {
    // Use subtle fade for reduced motion
    return {
      duration: 150,
      easing: safeEasing.out(safeEasing.quad),
    };
  }
  return preset;
}

/**
 * Get spring config with reduced motion support
 */
export function getSpringConfig(
  preset: { damping: number; stiffness: number; mass: number },
  reduceMotion: boolean
) {
  if (reduceMotion) {
    // Use very high damping to minimize motion
    return {
      damping: 50,
      stiffness: 100,
      mass: 1,
    };
  }
  return preset;
}

/**
 * Create a custom easing curve that accelerates faster than it decelerates
 * This mimics real-world physics with momentum
 */
export function createMomentumEasing(acceleration: number = 0.4, deceleration: number = 0.2) {
  return Easing.bezier(acceleration, 0.0, deceleration, 1.0);
}
