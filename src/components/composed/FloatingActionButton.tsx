import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '../ui/Text';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled(TouchableOpacity)<{ bottomInset: number }>`
  position: absolute;
  bottom: ${({ bottomInset, theme }: { bottomInset: number; theme: Theme }) => 
    bottomInset + 16 + 56 + 16}px; /* safe area + tab bar height (56) + spacing */
  right: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.primary};
  align-items: center;
  justify-content: center;
  shadow-color: ${({ theme }: { theme: Theme }) => theme.shadows.large.shadowColor};
  shadow-offset: ${({ theme }: { theme: Theme }) => `${theme.shadows.large.shadowOffset.width}px ${theme.shadows.large.shadowOffset.height}px`};
  shadow-opacity: ${({ theme }: { theme: Theme }) => theme.shadows.large.shadowOpacity};
  shadow-radius: ${({ theme }: { theme: Theme }) => theme.shadows.large.shadowRadius}px;
  elevation: ${({ theme }: { theme: Theme }) => (Platform.OS === 'android' ? 12 : 0)};
  z-index: 1001;
`;

export interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ReactNode;
  testID?: string;
}

export function FloatingActionButton({ onPress, icon, testID }: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <Container
      bottomInset={insets.bottom}
      onPress={onPress}
      testID={testID}
      accessible={true}
      accessibilityLabel="Add new item"
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      {icon || (
        <Text variant="h2" color="#ffffff">
          +
        </Text>
      )}
    </Container>
  );
}

