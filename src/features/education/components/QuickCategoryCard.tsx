import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/legacy/hooks/useTheme';
import { Text } from '@/shared/legacy/ui/Text';
import type { Theme } from '@/shared/legacy/theme/ThemeProvider';

const CategoryContainer = styled(TouchableOpacity)`
  align-items: center;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  min-width: 100px;
`;

const IconContainer = styled.View`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

const CategoryText = styled(Text)`
  text-align: center;
  max-width: 100px;
`;

export interface QuickCategoryCardProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  testID?: string;
}

export function QuickCategoryCard({ icon, label, onPress, testID }: QuickCategoryCardProps) {
  const { theme } = useTheme();

  return (
    <CategoryContainer onPress={onPress} testID={testID} activeOpacity={0.7}>
      <IconContainer>{icon}</IconContainer>
      <CategoryText variant="caption" color={theme.colors.text.medium} numberOfLines={2}>
        {label}
      </CategoryText>
    </CategoryContainer>
  );
}
