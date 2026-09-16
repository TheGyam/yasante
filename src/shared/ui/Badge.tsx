import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from './Text';
import type { Theme } from '@/shared/theme/ThemeProvider';

const StyledBadge = styled.View<{ variant: 'default' | 'primary' | 'success' | 'warning' | 'error' }>`
  align-self: flex-start;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.round}px;
  background-color: ${({ theme, variant }: { theme: Theme; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' }) => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.surfaceVariant;
    }
  }};
`;

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ children, variant = 'default', testID, style }: BadgeProps) {
  const { theme } = useTheme();

  const textColor =
    variant === 'default'
      ? theme.colors.text.high
      : variant === 'primary'
      ? '#ffffff'
      : '#ffffff';

  return (
    <StyledBadge variant={variant} testID={testID} style={style} accessible={true} accessibilityRole="text">
      <Text variant="caption" color={textColor} weight="medium">
        {children}
      </Text>
    </StyledBadge>
  );
}

