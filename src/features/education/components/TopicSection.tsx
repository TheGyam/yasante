import React from 'react';
import { ScrollView } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from '@/shared/ui/Text';
import { Content } from '@/features/education';
import { HorizontalContentCard } from './HorizontalContentCard';
import type { Theme } from '@/shared/theme/ThemeProvider';

const SectionContainer = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const SectionTitle = styled(Text)`
  flex: 1;
`;

const ContentScroll = styled.ScrollView.attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
})``;

export interface TopicSectionProps {
  title: string;
  content: Content[];
  onContentPress: (contentId: string) => void;
  onFavoritePress?: () => void;
  testID?: string;
}

export function TopicSection({ title, content, onContentPress, onFavoritePress, testID }: TopicSectionProps) {
  const { theme } = useTheme();

  if (content.length === 0) {
    return null;
  }

  return (
    <SectionContainer testID={testID}>
      <SectionHeader>
        <SectionTitle variant="h2" weight="bold">
          {title}
        </SectionTitle>
      </SectionHeader>
      <ContentScroll>
        {content.map((item) => (
          <HorizontalContentCard
            key={item.id}
            content={item}
            onPress={() => onContentPress(item.id)}
            onFavoritePress={onFavoritePress}
            testID={`${testID}-card-${item.id}`}
          />
        ))}
      </ContentScroll>
    </SectionContainer>
  );
}

