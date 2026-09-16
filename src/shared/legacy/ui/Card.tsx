import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import styled from 'styled-components/native';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const StyledCard = styled.View`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  shadow-color: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowColor};
  shadow-offset: ${({ theme }: { theme: Theme }) =>
    `${theme.shadows.small.shadowOffset.width}px ${theme.shadows.small.shadowOffset.height}px`};
  shadow-opacity: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowOpacity};
  shadow-radius: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowRadius}px;
  elevation: ${({ theme }: { theme: Theme }) =>
    Platform.OS === 'android' ? theme.shadows.small.elevation : 0};
`;

const PressableCard = styled(TouchableOpacity)`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  shadow-color: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowColor};
  shadow-offset: ${({ theme }: { theme: Theme }) =>
    `${theme.shadows.small.shadowOffset.width}px ${theme.shadows.small.shadowOffset.height}px`};
  shadow-opacity: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowOpacity};
  shadow-radius: ${({ theme }: { theme: Theme }) => theme.shadows.small.shadowRadius}px;
  elevation: ${({ theme }: { theme: Theme }) =>
    Platform.OS === 'android' ? theme.shadows.small.elevation : 0};
`;

export interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  onPress,
  testID,
  accessible,
  accessibilityLabel,
  ...props
}: CardProps) {
  if (onPress) {
    return (
      <PressableCard
        onPress={onPress}
        testID={testID}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </PressableCard>
    );
  }

  return (
    <StyledCard testID={testID} accessible={accessible} accessibilityLabel={accessibilityLabel}>
      {children}
    </StyledCard>
  );
}
