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

type SlideDirection = 'up' | 'down' | 'left' | 'right';

interface SlideInProps {
  children: React.ReactNode;
  direction?: SlideDirection;
  duration?: number;
  delay?: number;
  distance?: number;
  useSpring?: boolean;
}

export function SlideIn({
  children,
  direction = 'up',
  duration,
  delay = 0,
  distance = 30,
  useSpring = false,
}: SlideInProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  // Use preset duration if not specified
  const animationDuration = duration || (useSpring ? undefined : ANIMATION_PRESETS.slideIn.duration);

  useEffect(() => {
    if (reduceMotion) {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 1;
      return;
    }

    // Set initial position based on direction
    switch (direction) {
      case 'up':
        translateY.value = distance;
        break;
      case 'down':
        translateY.value = -distance;
        break;
      case 'left':
        translateX.value = distance;
        break;
      case 'right':
        translateX.value = -distance;
        break;
    }

    const timer = setTimeout(() => {
      if (useSpring) {
        const springConfig = getSpringConfig(ANIMATION_PRESETS.springIn, reduceMotion);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
        opacity.value = withSpring(1, springConfig);
      } else {
        const timingConfig = getAnimationConfig(
          { duration: animationDuration!, easing: ANIMATION_PRESETS.slideIn.easing },
          reduceMotion
        );
        translateX.value = withTiming(0, timingConfig);
        translateY.value = withTiming(0, timingConfig);
        opacity.value = withTiming(1, timingConfig);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [direction, animationDuration, delay, distance, useSpring, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
}

