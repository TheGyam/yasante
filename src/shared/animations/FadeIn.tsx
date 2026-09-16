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

const withTiming = (() => {
  try {
    return require('react-native-reanimated').withTiming;
  } catch {
    return (value: number) => value;
  }
})();

const withSpring = (() => {
  try {
    return require('react-native-reanimated').withSpring;
  } catch {
    return (value: number) => value;
  }
})();

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  useSpring?: boolean;
}

export function FadeIn({ children, duration, delay = 0, useSpring = false }: FadeInProps) {
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  // Use preset duration if not specified
  const animationDuration = duration || (useSpring ? undefined : ANIMATION_PRESETS.fadeIn.duration);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }

    const timer = setTimeout(() => {
      if (useSpring) {
        const springConfig = getSpringConfig(ANIMATION_PRESETS.springIn, reduceMotion);
        opacity.value = withSpring(1, springConfig);
      } else {
        const timingConfig = getAnimationConfig(
          { duration: animationDuration!, easing: ANIMATION_PRESETS.fadeIn.easing },
          reduceMotion
        );
        opacity.value = withTiming(1, timingConfig);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [animationDuration, delay, useSpring, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
}

