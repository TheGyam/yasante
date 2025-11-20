import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useTheme } from '@/hooks/useTheme';
import { useFavorites, useContent } from '@/api/hooks/useContent';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/composed/TopBar';
import { TopTabs } from '@/components/composed/TopTabs';
import { ContentCard } from '@/components/composed/ContentCard';
import { DIYCard, DIY } from '@/components/composed/DIYCard';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { TouchableOpacity } from 'react-native';
import { SharedElement } from 'react-native-shared-element';
import { Heart } from 'lucide-react-native';
import { useToggleFavorite, useIsFavorite } from '@/api/hooks/useContent';
import { formatRelativeTime } from '@/utils/date';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ScrollableContent = styled.ScrollView`
  flex: 1;
`;

const ContentWrapper = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
`;

const Section = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const GridContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const GridItem = styled.View<{ width: number }>`
  width: ${({ width }: { width: number }) => width}px;
`;

const CompactCard = styled(Card)`
  margin: 0;
`;

const CompactImageContainer = styled.View`
  width: 100%;
  height: 160px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  position: relative;
`;

const CompactFavoriteButton = styled(TouchableOpacity)`
  position: absolute;
  top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  width: 32px;
  height: 32px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const CompactContent = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const CompactTitle = styled(Text)`
  font-size: 14px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const CompactFooter = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const DIYList = styled.View`
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const tabs = [
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'diy', label: 'DIY' },
  { id: 'education', label: 'Education' },
];

interface CompactContentCardProps {
  content: any;
  onPress: () => void;
  width: number;
}

function CompactContentCard({ content, onPress, width }: CompactContentCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userId = user?.id || '';
  const { data: isFavorite = false } = useIsFavorite(userId, content.id, { enabled: !!userId });
  const toggleFavorite = useToggleFavorite(userId);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite.mutate(content.id);
  };

  return (
    <GridItem width={width}>
      <CompactCard onPress={onPress}>
        {content.thumbnailUri && (
          <CompactImageContainer>
            <SharedElement id={`media.${content.id}`} onNode={() => {}}>
              <ImageWithPlaceholder
                source={{ uri: content.thumbnailUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </SharedElement>
            <CompactFavoriteButton onPress={handleFavoritePress} activeOpacity={0.7}>
              <Heart 
                size={16} 
                color={isFavorite ? theme.colors.primary : "#fff"} 
                fill={isFavorite ? theme.colors.primary : "transparent"}
                strokeWidth={2.5} 
              />
            </CompactFavoriteButton>
          </CompactImageContainer>
        )}
        <CompactContent>
          <CompactTitle variant="body" weight="semibold" numberOfLines={2}>
            {content.title}
          </CompactTitle>
          <CompactFooter>
            <Text variant="caption" color={theme.colors.text.low} style={{ fontSize: 11 }}>
              {formatRelativeTime(content.publishedAt)}
            </Text>
          </CompactFooter>
        </CompactContent>
      </CompactCard>
    </GridItem>
  );
}

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: favorites } = useFavorites(authUser?.id || '', { enabled: !!authUser?.id && isAuthenticated });
  const { data: allContent } = useContent();
  const [activeTab, setActiveTab] = useState<'inspiration' | 'diy' | 'education'>('inspiration');

  // Calculate grid item width (2 columns with gap)
  const padding = theme.spacing[4] * 2;
  const gap = theme.spacing[3];
  const itemWidth = (width - padding - gap) / 2;

  // Resolve favorites to actual content objects
  const favoritesList = useMemo(() => {
    if (!favorites || !allContent?.data) return [];
    const contentArray = Array.isArray(allContent.data) ? allContent.data : [];
    return favorites
      .map((fav) => contentArray.find((c) => c.id === fav.contentId))
      .filter((content): content is NonNullable<typeof content> => content !== undefined);
  }, [favorites, allContent]);

  // Categorize favorites
  const categorizedFavorites = useMemo(() => {
    // Inspiration: Content items that are visual/inspirational (typically styling-related)
    const inspiration = favoritesList.filter(
      (item) => item.topic === 'styling' || item.topic === 'tips'
    );

    // Education: All other content items
    const education = favoritesList.filter(
      (item) => item.topic !== 'styling' && item.topic !== 'tips'
    );

    // DIY: For now, show empty state (DIYs might not be favoritable yet)
    const diy: DIY[] = [];

    return {
      inspiration,
      diy,
      education,
    };
  }, [favoritesList]);

  const renderContent = () => {
    switch (activeTab) {
      case 'inspiration':
        if (categorizedFavorites.inspiration.length === 0) {
          return (
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="body" color={theme.colors.text.medium} style={{ textAlign: 'center' }}>
                No inspiration favorites yet. Start favoriting inspiration posts to see them here.
              </Text>
            </View>
          );
        }
        return (
          <GridContainer>
            {categorizedFavorites.inspiration.map((item) => (
              <CompactContentCard
                key={item.id}
                content={item}
                onPress={() => router.push(`/(tabs)/home/${item.id}` as any)}
                width={itemWidth}
              />
            ))}
          </GridContainer>
        );

      case 'diy':
        if (categorizedFavorites.diy.length === 0) {
          return (
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="body" color={theme.colors.text.medium} style={{ textAlign: 'center' }}>
                No DIY favorites yet. Start favoriting DIY tutorials to see them here.
              </Text>
            </View>
          );
        }
        return (
          <DIYList>
            {categorizedFavorites.diy.map((diy) => (
              <DIYCard key={diy.id} diy={diy} />
            ))}
          </DIYList>
        );

      case 'education':
        if (categorizedFavorites.education.length === 0) {
          return (
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="body" color={theme.colors.text.medium} style={{ textAlign: 'center' }}>
                No education favorites yet. Start favoriting educational content to see them here.
              </Text>
            </View>
          );
        }
        return (
          <GridContainer>
            {categorizedFavorites.education.map((item) => (
              <CompactContentCard
                key={item.id}
                content={item}
                onPress={() => router.push(`/(tabs)/education/${item.id}` as any)}
                width={itemWidth}
              />
            ))}
          </GridContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <TopBar title="Favorites" />
      <TopTabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as any)} />
      <ScrollableContent>
        <ContentWrapper>
          <Section>{renderContent()}</Section>
        </ContentWrapper>
      </ScrollableContent>
    </Container>
  );
}
