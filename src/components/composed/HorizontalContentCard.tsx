import React from 'react';
import { TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { SharedElement } from 'react-native-shared-element';
import { Play, Heart } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { ImageWithPlaceholder } from '../ui/ImageWithPlaceholder';
import { Content } from '@/types/education';
import { useToggleFavorite, useIsFavorite } from '@/api/hooks/useContent';
import type { Theme } from '@/theme/ThemeProvider';

const CardContainer = styled(TouchableOpacity)`
  width: 220px;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.large}px;
  overflow: hidden;
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
`;

const ImageContainer = styled.View`
  width: 100%;
  height: 300px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  position: relative;
`;

const VideoBadge = styled.View`
  position: absolute;
  top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  width: 36px;
  height: 36px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 18px;
  align-items: center;
  justify-content: center;
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
`;

const ContentContainer = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const Title = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

export interface HorizontalContentCardProps {
  content: Content;
  onPress?: () => void;
  testID?: string;
}

export function HorizontalContentCard({ content, onPress, testID }: HorizontalContentCardProps) {
  const { theme } = useTheme();
  const userId = 'user-1'; // TODO: Get from auth context
  const { data: isFavorite = false } = useIsFavorite(userId, content.id);
  const toggleFavorite = useToggleFavorite(userId);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation(); // Prevent card press
    toggleFavorite.mutate(content.id);
  };

  return (
    <CardContainer onPress={onPress} testID={testID} activeOpacity={0.8}>
      <ImageContainer>
        {content.thumbnailUri && (
          <SharedElement id={`media.${content.id}`} onNode={() => {}}>
            <ImageWithPlaceholder
              source={{ uri: content.thumbnailUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </SharedElement>
        )}
        {content.type === 'video' && (
          <VideoBadge>
            <Play size={18} color="#fff" fill="#fff" strokeWidth={2.5} />
          </VideoBadge>
        )}
        <FavoriteButton onPress={handleFavoritePress} activeOpacity={0.7}>
          <Heart 
            size={18} 
            color={isFavorite ? theme.colors.primary : "#fff"} 
            fill={isFavorite ? theme.colors.primary : "transparent"}
            strokeWidth={2.5} 
          />
        </FavoriteButton>
      </ImageContainer>
      <ContentContainer>
        <Title variant="body" weight="semibold" numberOfLines={2}>
          {content.title}
        </Title>
      </ContentContainer>
    </CardContainer>
  );
}

