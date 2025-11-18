import React, { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AnimatedView } from './AnimatedView';

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
  duration = 360,
  delay = 0,
  distance = 50,
  useSpring = true,
}: SlideInProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();

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
        translateX.value = withSpring(0, { damping: 16, stiffness: 120 });
        translateY.value = withSpring(0, { damping: 16, stiffness: 120 });
        opacity.value = withSpring(1, { damping: 16, stiffness: 120 });
      } else {
        translateX.value = withTiming(0, { duration });
        translateY.value = withTiming(0, { duration });
        opacity.value = withTiming(1, { duration });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [direction, duration, delay, distance, useSpring, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
}

