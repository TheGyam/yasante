import React, { useEffect } from 'react';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { AnimatedView } from './AnimatedView';
import { ANIMATION_PRESETS, getAnimationConfig, getSpringConfig } from '@/shared/utils/animations';

// Conditionally import Reanimated
const useSharedValue = (() => {
  try {
    return require('react-native-reanimated').useSharedValue;
  } catch {
    return (value: number) => ({ value });
  }
})();

const useAnimatedStyle = (() => {
  try {
    return require('react-native-reanimated').useAnimatedStyle;
  } catch {
    return (fn: () => any) => fn();
  }
})();

const withSpring = (() => {
  try {
    return require('react-native-reanimated').withSpring;
  } catch {
    return (value: number) => value;
  }
})();

const withTiming = (() => {
  try {
    return require('react-native-reanimated').withTiming;
  } catch {
    return (value: number) => value;
  }
})();

interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  useSpring?: boolean;
}

export function ScaleIn({ children, duration, delay = 0, useSpring = false }: ScaleInProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  // Use preset duration if not specified
  const animationDuration =
    duration || (useSpring ? undefined : ANIMATION_PRESETS.scaleIn.duration);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    const timer = setTimeout(() => {
      if (useSpring) {
        const springConfig = getSpringConfig(ANIMATION_PRESETS.springIn, reduceMotion);
        scale.value = withSpring(1, springConfig);
        opacity.value = withSpring(1, springConfig);
      } else {
        const timingConfig = getAnimationConfig(
          { duration: animationDuration!, easing: ANIMATION_PRESETS.scaleIn.easing },
          reduceMotion
        );
        opacity.value = withTiming(1, timingConfig);
        scale.value = withTiming(1, timingConfig);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [animationDuration, delay, useSpring, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
}
