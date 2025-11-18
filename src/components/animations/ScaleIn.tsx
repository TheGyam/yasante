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

interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  useSpring?: boolean;
}

export function ScaleIn({ children, duration = 360, delay = 0, useSpring = true }: ScaleInProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    const timer = setTimeout(() => {
      if (useSpring) {
        scale.value = withSpring(1, { damping: 16, stiffness: 120 });
        opacity.value = withSpring(1, { damping: 16, stiffness: 120 });
      } else {
        opacity.value = withTiming(1, { duration });
        scale.value = withTiming(1, { duration });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [duration, delay, useSpring, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
}

