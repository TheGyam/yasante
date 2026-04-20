import React from 'react';
import { ActivityIndicator, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Theme } from '@/theme/ThemeProvider';

// Conditionally import Reanimated
const Animated = (() => {
  try {
    return require('react-native-reanimated').default;
  } catch {
    return require('react-native').Animated;
  }
})();

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

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

interface StyledButtonProps {
  variant: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StyledButtonBase = Animated?.createAnimatedComponent(TouchableOpacity) || TouchableOpacity;
const StyledButton = styled(StyledButtonBase)<StyledButtonProps>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  padding: ${({ size, theme }: { size?: 'small' | 'medium' | 'large'; theme: Theme }) => {
    switch (size) {
      case 'small':
        return `${theme.spacing[2]}px ${theme.spacing[4]}px`;
      case 'large':
        return `${theme.spacing[4]}px ${theme.spacing[6]}px`;
      default:
        return `${theme.spacing[3]}px ${theme.spacing[5]}px`;
    }
  }};
  min-height: ${({ size }: { size?: 'small' | 'medium' | 'large' }) => {
    switch (size) {
      case 'small':
        return '36px';
      case 'large':
        return '56px';
      default:
        return '44px';
    }
  }};
  width: ${({ fullWidth }: { fullWidth?: boolean }) => (fullWidth ? '100%' : 'auto')};
  background-color: ${({ variant, theme, disabled }: { variant: ButtonVariant; theme: Theme; disabled?: boolean }) => {
    if (disabled) return theme.colors.surfaceVariant;
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.accent;
      case 'outline':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  }};
  border-width: ${({ variant }: { variant: ButtonVariant }) => (variant === 'outline' ? '1px' : '0px')};
  border-color: ${({ theme, disabled }: { theme: Theme; disabled?: boolean }) =>
    disabled ? theme.colors.border : theme.colors.primary};
  opacity: ${({ disabled }: { disabled?: boolean }) => (disabled ? 0.5 : 1)};
`;

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  testID?: string;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  children,
  testID,
  accessible = true,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const textColor =
    variant === 'primary'
      ? '#ffffff'
      : variant === 'secondary'
      ? theme.colors.text.high
      : theme.colors.primary;

  const isDisabled = disabled || loading;

  const handlePressIn = () => {
    if (!isDisabled && !reduceMotion) {
      scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    if (!isDisabled && !reduceMotion) {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }
  };

  const animatedStyle = useAnimatedStyle
    ? useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
      }))
    : {};

  return (
    <StyledButton
      variant={variant}
      disabled={isDisabled}
      fullWidth={fullWidth}
      size={size}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: isDisabled, busy: loading }}
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      activeOpacity={reduceMotion ? 0.7 : 1}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : theme.colors.primary}
          testID={testID ? `${testID}-loading` : undefined}
        />
      ) : (
        <Text
          variant={size === 'small' ? 'label' : 'body'}
          weight={size === 'large' ? 'semibold' : 'medium'}
          color={isDisabled ? theme.colors.text.disabled : textColor}
        >
          {children}
        </Text>
      )}
    </StyledButton>
  );
}

