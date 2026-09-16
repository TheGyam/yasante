import type React from 'react';
import { View, ViewProps } from 'react-native';

// Conditionally use Reanimated or fallback to regular View
const Animated = (() => {
  try {
    return require('react-native-reanimated').default;
  } catch {
    // Fallback to regular View if Reanimated not available
    return { createAnimatedComponent: (Component: any) => Component };
  }
})();

export const AnimatedView: React.ComponentType<ViewProps> = Animated.createAnimatedComponent(View);
