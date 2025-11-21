import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, View, GestureResponderEvent } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useContent } from '@/api/hooks/useContent';
import { useUser } from '@/api/hooks/useUser';
import { useAuth } from '@/contexts/AuthContext';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { Text } from '@/components/ui/Text';
import { Play, Share2, Search, Lightbulb, Sparkles, LayoutGrid } from 'lucide-react-native';
import { SharedElement } from 'react-native-shared-element';
import { GreetingBanner } from '@/components/composed/GreetingBanner';
import { HorizontalContentCard } from '@/components/composed/HorizontalContentCard';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import { AddToMoodBoardModal } from '@/components/composed/AddToMoodBoardModal';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const MainScrollView = styled.ScrollView`
  flex: 1;
`;

// Reusable Section Component
const Section = styled.View`
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
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
  font-weight: 600;
  letter-spacing: 0.3px;
  font-size: 22px;
`;

const DIYTipsSection = styled(Section)`
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const DIYTipsScroll = styled.ScrollView.attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
})``;

const SearchSection = styled(Section)`
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const SearchInputWrapper = styled.View``;

const SearchButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  min-height: 44px;
`;

const SearchButtonText = styled(Text)`
  flex: 1;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.low};
`;

const TipOfTheDayCard = styled.View`
  margin-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.large}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  elevation: 2;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.08;
  shadow-radius: 8px;
`;

const TipHeader = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const TipIconContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(94, 29, 49, 0.1);
  align-items: center;
  justify-content: center;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const TipTitleContainer = styled.View`
  flex: 1;
`;

const TipLabel = styled(Text)`
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const TipTitle = styled(Text)`
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.2px;
`;

const TipContent = styled(Text)`
  line-height: 22px;
  letter-spacing: 0.1px;
`;

const SectionDivider = styled.View`
  height: 1px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
  margin-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  opacity: 0.2;
`;

const InspoSection = styled(Section)`
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-bottom: 0;
`;

const GridContainer = styled.View`
  position: relative;
`;

const GridContent = styled.View<{ height: number }>`
  height: ${({ height }: { height: number }) => height}px;
  position: relative;
`;

const GridItem = styled.View<{ left: number; top: number; width: number; height: number }>`
  position: absolute;
  left: ${({ left }: { left: number }) => left}px;
  top: ${({ top }: { top: number }) => top}px;
  width: ${({ width }: { width: number }) => width}px;
  height: ${({ height }: { height: number }) => height}px;
`;

const CardContainer = styled(TouchableOpacity)`
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
`;

const ImageWrapper = styled.View`
  width: 100%;
  flex: 1;
  position: relative;
  border-top-left-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  border-top-right-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  overflow: hidden;
`;

const VideoBadge = styled.View`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  z-index: 2;
`;

const BottomCard = styled.View`
  width: 100%;
  height: 24px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-bottom-left-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  border-bottom-right-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px -1px;
  shadow-opacity: 0.06;
  shadow-radius: 2px;
`;

const ShareButton = styled(TouchableOpacity)`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  align-items: center;
  justify-content: center;
`;

const BottomCardActions = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  align-items: center;
`;

interface InspoItem {
  id: string;
  imageUri: string;
  isVideo?: boolean;
  videoUri?: string;
  width: number;
  height: number;
  left: number;
  top: number;
}

const CARD_BOTTOM_HEIGHT = 24; // Height of the bottom card

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const { data: contentData, isLoading, refetch } = useContent();
  const { data: user } = useUser('user-1');
  const { isAuthenticated } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showAddToMoodBoard, setShowAddToMoodBoard] = useState(false);
  const [selectedInspoForMoodBoard, setSelectedInspoForMoodBoard] = useState<{ title: string; imageUri?: string } | null>(null);

  // Get first name for greeting (only when authenticated)
  const firstName = isAuthenticated && user?.name ? user.name.split(' ')[0] : undefined;

  // Tip of the day - rotate tips daily
  const tipsOfTheDay = [
    "Protect your hair from heat damage by using a heat protectant spray before styling. Your future self will thank you!",
    "Deep condition your hair once a week to restore moisture and prevent breakage. Consistency is key to healthy hair.",
    "Sleep on a silk or satin pillowcase to reduce friction and prevent hair breakage while you sleep. Beauty sleep, literally!",
    "Trim your hair every 6-8 weeks to prevent split ends from traveling up the hair shaft. Regular trims = healthier hair.",
    "Avoid brushing wet hair with a regular brush. Use a wide-tooth comb or detangling brush to prevent breakage.",
  ];
  
  // Get tip based on day of year for consistency
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tipOfTheDay = tipsOfTheDay[dayOfYear % tipsOfTheDay.length];

  // Small spacing between items (5px for better breathing room)
  const gap = 5;
  const paddingHorizontal = theme.spacing[4];
  const availableWidth = width - paddingHorizontal * 2;
  const itemWidth = (availableWidth - gap) / 2; // Same width for all items

  // Aspect ratios for height variation - make them MUCH taller (higher = taller)
  // Target: ~4 posts visible per screen, so images need to be very tall
  // Very tall images: 1.2-1.8 range (much taller than before)
  const aspectRatios = [1.3, 1.5, 1.4, 1.6, 1.35, 1.45, 1.2, 1.7, 1.55, 1.4, 1.5, 1.65];

  // Filter DIY tips content (articles with tips topic)
  const diyTipsContent = useMemo(() => {
    if (!contentData?.data) return [];
    const filtered = contentData.data.filter(
      (item) => item.topic === 'tips' || item.topic === 'care' || item.topic === 'styling'
    );

    return filtered.slice(0, 10); // Limit to 10 items for horizontal scroll
  }, [contentData?.data]);

  // Transform content into inspo items with uniform width but varying heights
  const { items: inspoItems, totalHeight } = useMemo(() => {
    if (!contentData?.data) return { items: [], totalHeight: 0 };

    const filteredContent = contentData.data;

    const items: InspoItem[] = [];
    filteredContent.forEach((item, index) => {
      for (let i = 0; i < 3; i++) {
        const aspectRatioIndex = (index * 3 + i) % aspectRatios.length;
        const aspectRatio = aspectRatios[aspectRatioIndex];
        // Total height includes image + card bottom
        const imageHeight = itemWidth * aspectRatio;
        const totalItemHeight = imageHeight + CARD_BOTTOM_HEIGHT;
        items.push({
          id: `${item.id}-${i}`,
          imageUri: item.thumbnailUri || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
          isVideo: item.type === 'video',
          videoUri: item.videoUri,
          width: itemWidth,
          height: totalItemHeight, // Total height = image + card
          left: 0, // Will be calculated
          top: 0, // Will be calculated
        });
      }
    });

    // Simple masonry layout - all items same width, placed in shortest column
    const processedItems: InspoItem[] = [];
    const columnHeights = [0, 0]; // Track height of each column
    let maxHeight = 0;

    // Show more items for infinite scroll
    items.forEach((item) => {
      // Find the shortest column
      const shortestColumnIndex = columnHeights[0] <= columnHeights[1] ? 0 : 1;

      // Calculate position
      const itemLeft = paddingHorizontal + shortestColumnIndex * (itemWidth + gap);
      const itemTop = columnHeights[shortestColumnIndex] + gap;

      // Update column height
      columnHeights[shortestColumnIndex] = itemTop + item.height;
      maxHeight = Math.max(maxHeight, itemTop + item.height);

      processedItems.push({
        ...item,
        left: itemLeft,
        top: itemTop,
      });
    });

    return { items: processedItems, totalHeight: maxHeight };
  }, [contentData?.data, width, itemWidth, availableWidth, paddingHorizontal, gap, aspectRatios]);

  const handleRefresh = () => {
    refetch();
  };

  const handleItemPress = (item: InspoItem) => {
    router.push(`/(tabs)/home/${item.id}` as any);
  };

  const handleShare = (item: InspoItem, e: GestureResponderEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
    console.log('Share item:', item.id);
  };

  const handleDIYTipPress = (contentId: string) => {
    router.push(`/(tabs)/education/${contentId}` as any);
  };

  const handleSearchPress = () => {
    router.push('/(tabs)/home/search' as any);
  };

  return (
    <Container testID="home-screen">
      <MainScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Greeting Banner */}
        <GreetingBanner topInset={insets.top} firstName={firstName} />

        {/* Search Bar */}
        <SearchSection>
          <SearchInputWrapper>
            <SearchButton onPress={handleSearchPress} activeOpacity={0.7}>
              <Search size={18} color={theme.colors.text.low} />
              <SearchButtonText variant="body">
                Search for tips, styles, and inspiration...
              </SearchButtonText>
            </SearchButton>
          </SearchInputWrapper>
        </SearchSection>

        {/* Hair Tips & Styles Section */}
        <DIYTipsSection>
          <SectionHeader>
            <SectionTitle variant="h2" weight="semibold" color={theme.colors.text.high}>
              Hair Tips & Styles We Love
            </SectionTitle>
          </SectionHeader>
          <DIYTipsScroll>
            {diyTipsContent.map((item) => (
              <HorizontalContentCard
                key={item.id}
                content={item}
                onPress={() => handleDIYTipPress(item.id)}
                onFavoritePress={() => setShowAuthPrompt(true)}
              />
            ))}
          </DIYTipsScroll>
        </DIYTipsSection>

        {/* Tip of the Day Card */}
        <TipOfTheDayCard>
          <TipHeader>
            <TipIconContainer>
              <Sparkles size={20} color={theme.colors.primary} strokeWidth={2.5} />
            </TipIconContainer>
            <TipTitleContainer>
              <TipLabel variant="caption" color={theme.colors.primary} weight="semibold">
                Tip of the Day
              </TipLabel>
              <TipTitle variant="h3" weight="semibold" color={theme.colors.text.high}>
                Daily Hair Wisdom
              </TipTitle>
            </TipTitleContainer>
          </TipHeader>
          <TipContent variant="body" color={theme.colors.text.medium}>
            {tipOfTheDay}
          </TipContent>
        </TipOfTheDayCard>

        {/* Visual divider for better transition */}
        <SectionDivider />

        {/* Inspiration Grid - Rest of the space (no title, flows naturally) */}
        <InspoSection>
          <GridContainer>
            <GridContent height={totalHeight}>
              {inspoItems.map((item) => {
                // Calculate image height (total height minus card bottom)
                const imageHeight = item.height - CARD_BOTTOM_HEIGHT;
                
                return (
                  <GridItem
                    key={item.id}
                    left={item.left}
                    top={item.top}
                    width={item.width}
                    height={item.height}
                  >
                    <CardContainer
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.9}
                    >
                      <ImageWrapper style={{ height: imageHeight }}>
                        <SharedElement id={`media.${item.id}`} onNode={() => {}}>
                          <ImageWithPlaceholder
                            source={{ uri: item.imageUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </SharedElement>
                        {item.isVideo && (
                          <VideoBadge>
                            <Play size={14} color="#fff" fill="#fff" strokeWidth={2.5} />
                          </VideoBadge>
                        )}
                      </ImageWrapper>
                      <BottomCard>
                        <BottomCardActions>
                          <ShareButton
                            onPress={(e: GestureResponderEvent) => {
                              e.stopPropagation();
                              handleShare(item, e);
                            }}
                            activeOpacity={0.7}
                          >
                            <Share2 size={12} color={theme.colors.text.high} strokeWidth={2} />
                          </ShareButton>
                          <ShareButton
                            onPress={(e: GestureResponderEvent) => {
                              e.stopPropagation();
                              if (!isAuthenticated) {
                                setShowAuthPrompt(true);
                              } else {
                                setSelectedInspoForMoodBoard({ title: item.title, imageUri: item.imageUri });
                                setShowAddToMoodBoard(true);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <LayoutGrid size={12} color={theme.colors.text.high} strokeWidth={2} />
                          </ShareButton>
                        </BottomCardActions>
                      </BottomCard>
                    </CardContainer>
                  </GridItem>
                );
              })}
            </GridContent>
          </GridContainer>
        </InspoSection>
      </MainScrollView>
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        feature="favorites"
      />
      {selectedInspoForMoodBoard && (
        <AddToMoodBoardModal
          visible={showAddToMoodBoard}
          onClose={() => {
            setShowAddToMoodBoard(false);
            setSelectedInspoForMoodBoard(null);
          }}
          inspoTitle={selectedInspoForMoodBoard.title}
          inspoImageUri={selectedInspoForMoodBoard.imageUri}
        />
      )}
    </Container>
  );
}
