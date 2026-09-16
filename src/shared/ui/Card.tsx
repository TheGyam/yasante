import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { radius, space } from '@/shared/theme';
import type { HapticKind } from '@/shared/lib/haptics';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  haptic?: HapticKind;
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** A glass card. Becomes pressable when given `onPress`. */
export function Card({
  children,
  onPress,
  onLongPress,
  haptic,
  padding = space.lg,
  radius: r = radius.lg,
  style,
  accessibilityLabel,
  testID,
}: CardProps) {
  const surface = (
    <Glass radius={r} style={[{ padding }, style]} testID={onPress ? undefined : testID}>
      {children}
    </Glass>
  );

  if (!onPress) return surface;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      haptic={haptic}
      scaleTo={0.98}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {surface}
    </PressableScale>
  );
}
