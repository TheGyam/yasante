import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { timing } from '@/shared/theme';
import { haptics, type HapticKind } from '@/shared/lib/haptics';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  /** Applied to the element that scales. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the touch target — use for flex and positioning. */
  containerStyle?: StyleProp<ViewStyle>;
  /** 0.97 for buttons and cards; closer to 1 for large surfaces. */
  scaleTo?: number;
  /** Fired when the press commits, never on press-in. */
  haptic?: HapticKind;
}

/**
 * The single press primitive. Feedback starts on press-in and runs entirely on the
 * UI thread, so pressing never causes a React render.
 */
export function PressableScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.97,
  haptic,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  hitSlop = 8,
  accessibilityRole = 'button',
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const p = pressed.get();
    // Reduced motion keeps the acknowledgement but drops the movement.
    return reduced ? { opacity: 1 - p * 0.25 } : { transform: [{ scale: 1 - p * (1 - scaleTo) }] };
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    pressed.set(withTiming(1, timing.pressIn));
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    pressed.set(withTiming(0, timing.pressOut));
    onPressOut?.(e);
  };
  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) haptics[haptic]();
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      disabled={disabled}
      hitSlop={hitSlop}
      pressRetentionOffset={16}
      style={containerStyle}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, animatedStyle, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
});
