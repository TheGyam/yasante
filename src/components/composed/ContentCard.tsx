import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { SharedElement } from 'react-native-shared-element';
import { Heart } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { ImageWithPlaceholder } from '../ui/ImageWithPlaceholder';
import { Content } from '@/types/education';
import { formatRelativeTime } from '@/utils/date';
import { useToggleFavorite, useIsFavorite } from '@/api/hooks/useContent';
import type { Theme } from '@/theme/ThemeProvider';

const ImageContainer = styled.View`
  width: 100%;
  height: 200px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  position: relative;
`;

const FavoriteButton = styled(TouchableOpacity)`
  position: absolute;
  top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  width: 36px;
  height: 36px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const TopicBadge = styled(Badge)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

export interface ContentCardProps {
  content: Content;
  onPress?: () => void;
  testID?: string;
}

export function ContentCard({ content, onPress, testID }: ContentCardProps) {
  const { theme } = useTheme();
  const userId = 'user-1'; // TODO: Get from auth context
  const { data: isFavorite = false } = useIsFavorite(userId, content.id);
  const toggleFavorite = useToggleFavorite(userId);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation(); // Prevent card press
    toggleFavorite.mutate(content.id);
  };

  return (
    <Card onPress={onPress} testID={testID}>
      {content.thumbnailUri && (
        <ImageContainer>
          <SharedElement id={`media.${content.id}`}>
            <ImageWithPlaceholder
              source={{ uri: content.thumbnailUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </SharedElement>
          <FavoriteButton onPress={handleFavoritePress} activeOpacity={0.7}>
            <Heart 
              size={18} 
              color={isFavorite ? theme.colors.primary : "#fff"} 
              fill={isFavorite ? theme.colors.primary : "transparent"}
              strokeWidth={2.5} 
            />
          </FavoriteButton>
        </ImageContainer>
      )}
      <TopicBadge variant="default">{content.topic}</TopicBadge>
      <Header>
        <Text variant="h3" weight="semibold" style={{ flex: 1 }}>
          {content.title}
        </Text>
        {content.type === 'video' && (
          <Badge variant="primary" style={{ marginLeft: theme.spacing[2] }}>
            Video
          </Badge>
        )}
      </Header>
      <Text variant="body" color={theme.colors.text.medium} numberOfLines={2}>
        {content.description}
      </Text>
      <Footer>
        <Text variant="caption" color={theme.colors.text.low}>
          {formatRelativeTime(content.publishedAt)}
        </Text>
        {content.duration && (
          <Text variant="caption" color={theme.colors.text.low}>
            {content.duration} min
          </Text>
        )}
      </Footer>
    </Card>
  );
}

