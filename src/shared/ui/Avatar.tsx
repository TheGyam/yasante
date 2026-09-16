import React from 'react';
import { Image, ImageSourcePropType, ViewStyle, StyleProp } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from './Text';
import type { Theme } from '@/shared/theme/ThemeProvider';

const Container = styled.View<{ size: number }>`
  width: ${({ size }: { size: number }) => size}px;
  height: ${({ size }: { size: number }) => size}px;
  border-radius: ${({ size }: { size: number }) => size / 2}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  align-items: center;
  justify-content: center;
`;

const StyledImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

export interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ source, name, size = 40, testID, style }: AvatarProps) {
  const { theme } = useTheme();

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Container size={size} testID={testID} style={style} accessible={true} accessibilityRole="image">
      {source ? (
        <StyledImage source={source} resizeMode="cover" />
      ) : (
        <Text variant="body" weight="semibold" color={theme.colors.text.medium}>
          {initials || '?'}
        </Text>
      )}
    </Container>
  );
}

