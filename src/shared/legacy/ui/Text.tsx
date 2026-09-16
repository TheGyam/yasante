import React from 'react';
import styled from 'styled-components/native';
import { TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';

interface StyledTextProps {
  variant: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

const StyledText = styled.Text<StyledTextProps>`
  color: ${({ theme, color }) => color || theme.colors.text.high};
  text-align: ${({ align }) => align || 'left'};
  font-family: ${({ weight, variant, theme }) => {
    // Use custom font if available, otherwise fallback to system font
    const fontName = weight
      ? theme.fontFamily[weight]
      : variant === 'h1' || variant === 'h2' || variant === 'h3'
        ? theme.fontFamily.bold
        : variant === 'label'
          ? theme.fontFamily.semibold
          : theme.fontFamily.regular;
    // React Native will fallback to system font if font doesn't exist
    return fontName || 'System';
  }};
  font-weight: ${({ weight, variant, theme }) => {
    if (weight) return theme.fontWeights[weight];
    if (variant === 'h1' || variant === 'h2' || variant === 'h3') return theme.fontWeights.bold;
    if (variant === 'label') return theme.fontWeights.semibold;
    return theme.fontWeights.regular;
  }};
  font-size: ${({ variant, theme }) => {
    switch (variant) {
      case 'h1':
        return `${theme.fontSizes[6]}px`;
      case 'h2':
        return `${theme.fontSizes[5]}px`;
      case 'h3':
        return `${theme.fontSizes[4]}px`;
      case 'body':
        return `${theme.fontSizes[2]}px`;
      case 'caption':
        return `${theme.fontSizes[0]}px`;
      case 'label':
        return `${theme.fontSizes[1]}px`;
      default:
        return `${theme.fontSizes[2]}px`;
    }
  }};
  line-height: ${({ variant, theme }) => {
    switch (variant) {
      case 'h1':
        return `${theme.lineHeights[6]}px`;
      case 'h2':
        return `${theme.lineHeights[5]}px`;
      case 'h3':
        return `${theme.lineHeights[4]}px`;
      case 'body':
        return `${theme.lineHeights[2]}px`;
      case 'caption':
        return `${theme.lineHeights[0]}px`;
      case 'label':
        return `${theme.lineHeights[1]}px`;
      default:
        return `${theme.lineHeights[2]}px`;
    }
  }};
`;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
  testID?: string;
}

export function Text({
  variant = 'body',
  color,
  align,
  weight,
  children,
  testID,
  accessible = true,
  accessibilityLabel,
  allowFontScaling = true,
  ...props
}: TextProps) {
  return (
    <StyledText
      variant={variant}
      color={color}
      align={align}
      weight={weight}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={
        accessibilityLabel || (typeof children === 'string' ? children : undefined)
      }
      allowFontScaling={allowFontScaling}
      {...props}
    >
      {children}
    </StyledText>
  );
}
