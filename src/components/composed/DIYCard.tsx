import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '../ui/Text';
import { ImageWithPlaceholder } from '../ui/ImageWithPlaceholder';
import { SwipeableFlashcard, FlashcardStep } from './SwipeableFlashcard';
import type { Theme } from '@/theme/ThemeProvider';

const DIYCardContainer = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const DIYHeader = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const DIYTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const DIYDescription = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const FlashcardWrapper = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

export interface DIY {
  id: string;
  title: string;
  description: string;
  thumbnailUri?: string;
  steps: FlashcardStep[];
}

export interface DIYCardProps {
  diy: DIY;
}

export function DIYCard({ diy }: DIYCardProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    router.push(`/(tabs)/education/diy/${diy.id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <DIYCardContainer>
        <DIYHeader>
          <DIYTitle variant="h2" weight="bold" color={theme.colors.text.high}>
            {diy.title}
          </DIYTitle>
          <DIYDescription variant="body" color={theme.colors.text.medium}>
            {diy.description}
          </DIYDescription>
        </DIYHeader>
        <FlashcardWrapper>
          <SwipeableFlashcard steps={diy.steps} />
        </FlashcardWrapper>
      </DIYCardContainer>
    </TouchableOpacity>
  );
}


