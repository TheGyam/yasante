import React from 'react';
import { SvgProps } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

export interface IconProps extends SvgProps {
  size?: number;
  color?: string;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Base Icon component wrapper for SVG icons
 * Use this as a base for all custom icons
 */
export function Icon({
  size = 24,
  color,
  testID,
  accessible = true,
  accessibilityLabel,
  ...props
}: IconProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.colors.text.medium;

  // This is a placeholder - actual icons should extend this
  return null;
}

