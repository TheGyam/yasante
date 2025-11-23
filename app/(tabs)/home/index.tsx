import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, RefreshControl, useWindowDimensions, View, GestureResponderEvent, InteractionManager, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useInfiniteContent, prefetchContentItem, prefetchRelatedContent } from '@/api/hooks/useContent';
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
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useNewPosts } from '@/hooks/useNewPosts';
import { Content } from '@/types/education';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const FlashListContainer = styled.View`
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

const InspoCardContainer = styled.View`
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const CardContainer = styled(TouchableOpacity)`
  width: 100%;
  position: relative;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
`;

const ImageWrapper = styled.View<{ height: number }>`
  width: 100%;
  height: ${({ height }: { height: number }) => height}px;
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
  originalId: string;
  imageUri: string;
  isVideo?: boolean;
  videoUri?: string;
  topic?: string;
  title?: string;
  height: number; // For estimatedItemSize
}

const CARD_BOTTOM_HEIGHT = 24; // Height of the bottom card

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { 
    data: contentData, 
    isLoading, 
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteContent();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: user } = useUser(authUser?.id, { enabled: !!authUser?.id });
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showAddToMoodBoard, setShowAddToMoodBoard] = useState(false);
  const [selectedInspoForMoodBoard, setSelectedInspoForMoodBoard] = useState<{ title: string; imageUri?: string } | null>(null);
  const [layoutItems, setLayoutItems] = useState<InspoItem[]>([]);
  const layoutComputedRef = useRef(false);
  
  // New posts detection
  const { hasNewPosts, mergeNewPosts } = useNewPosts({ enabled: true });

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

  // Flatten all pages from infinite query
  const allContentItems = useMemo(() => {
    if (!contentData?.pages) return [];
    return contentData.pages.flatMap(page => page.data);
  }, [contentData?.pages]);
  
  // Prefetch images of next page after fetching
  useEffect(() => {
    if (contentData?.pages && contentData.pages.length > 0) {
      const lastPage = contentData.pages[contentData.pages.length - 1];
      if (lastPage?.data) {
        // Prefetch images of the last fetched page
        lastPage.data.forEach((item: Content) => {
          if (item.thumbnailUri) {
            // expo-image will handle caching automatically
            // We can preload by creating Image components off-screen if needed
          }
        });
      }
    }
  }, [contentData?.pages]);

  // Filter DIY tips content (articles with tips topic)
  const diyTipsContent = useMemo(() => {
    if (!allContentItems) return [];
    const filtered = allContentItems.filter(
      (item) => item.topic === 'tips' || item.topic === 'care' || item.topic === 'styling'
    );

    return filtered.slice(0, 10); // Limit to 10 items for horizontal scroll
  }, [allContentItems]);

  // Transform content into inspo items - deferred computation
  useEffect(() => {
    if (!allContentItems || allContentItems.length === 0 || layoutComputedRef.current) return;
    
    // Defer heavy computation
    InteractionManager.runAfterInteractions(() => {
      const items: InspoItem[] = [];
      allContentItems.forEach((item, index) => {
        for (let i = 0; i < 3; i++) {
          const aspectRatioIndex = (index * 3 + i) % aspectRatios.length;
          const aspectRatio = aspectRatios[aspectRatioIndex];
          const imageHeight = itemWidth * aspectRatio;
          const totalItemHeight = imageHeight + CARD_BOTTOM_HEIGHT;
          
          items.push({
            id: `${item.id}-${i}`,
            originalId: item.id,
            imageUri: item.thumbnailUri || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80',
            isVideo: item.type === 'video',
            videoUri: item.videoUri,
            topic: item.topic,
            title: item.title,
            height: totalItemHeight,
          });
        }
      });
      
      setLayoutItems(items);
      layoutComputedRef.current = true;
    });
  }, [allContentItems, itemWidth, aspectRatios]);
  
  // Reset computation flag when content changes significantly
  useEffect(() => {
    layoutComputedRef.current = false;
  }, [(allContentItems || []).length]);

  const handleRefresh = () => {
    refetch();
  };

  const handleItemPress = useCallback((item: InspoItem) => {
    // Prefetch detail data before navigation
    prefetchContentItem(queryClient, item.originalId);
    
    // Prefetch related content if topic is available
    if (item.topic) {
      prefetchRelatedContent(queryClient, item.originalId, item.topic);
    }
    
    // Navigate after prefetch starts
    router.push(`/(tabs)/home/${item.id}` as any);
  }, [queryClient, router]);

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
  
  // Smart prefetching - prefetch when reaching 60% of loaded items
  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (!viewableItems || viewableItems.length === 0 || !hasNextPage || isFetchingNextPage) return;
    
    if (!layoutItems || layoutItems.length === 0) return;
    const totalItems = layoutItems.length;
    
    // Get the last visible item index
    const visibleIndices = viewableItems.map((item) => item.index).filter((idx): idx is number => idx !== null);
    if (visibleIndices.length === 0) return;
    
    const lastVisibleIndex = Math.max(...visibleIndices);
    
    // Prefetch when reaching 60% of loaded items
    const threshold = Math.floor(totalItems * 0.6);
    if (lastVisibleIndex >= threshold) {
      fetchNextPage();
    }
  }, [(layoutItems || []).length, hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  // Render item for FlashList
  const renderItem = useCallback(({ item }: { item: InspoItem }) => {
    const imageHeight = item.height - CARD_BOTTOM_HEIGHT;
    
    return (
      <InspoCardContainer>
        <CardContainer
          onPress={() => handleItemPress(item)}
          activeOpacity={0.9}
        >
          <ImageWrapper height={imageHeight}>
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
                    setSelectedInspoForMoodBoard({ title: item.title || '', imageUri: item.imageUri });
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
      </InspoCardContainer>
    );
  }, [handleItemPress, theme, isAuthenticated]);
  
  // List header component
  const ListHeaderComponent = useMemo(() => (
    <View>
      <GreetingBanner topInset={insets.top} firstName={firstName} />
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
      <SectionDivider />
      {hasNewPosts && (
        <TouchableOpacity
          onPress={mergeNewPosts}
          style={{
            margin: theme.spacing[4],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.medium,
            alignItems: 'center',
          }}
        >
          <Text variant="body" weight="semibold" color="#fff">
            New posts available - Tap to refresh
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ), [firstName, insets.top, theme, diyTipsContent, tipOfTheDay, hasNewPosts, mergeNewPosts, handleSearchPress, handleDIYTipPress]);
  
  // List footer component
  const ListFooterComponent = useMemo(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ padding: theme.spacing[4], alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text variant="body" color={theme.colors.text.medium} style={{ marginTop: theme.spacing[2] }}>
          Loading more...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, theme]);

  // Calculate estimated item size for FlashList
  const estimatedItemSize = useMemo(() => {
    if (!layoutItems || layoutItems.length === 0) return 300;
    const avgHeight = layoutItems.reduce((sum, item) => sum + item.height, 0) / layoutItems.length;
    return avgHeight || 300;
  }, [layoutItems]);

  return (
    <Container testID="home-screen">
      <FlashListContainer>
        <FlashList
          data={layoutItems || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
          removeClippedSubviews={false} // Disable to prevent image recycling issues
          drawDistance={1000} // Increase draw distance to preload more images
          showsVerticalScrollIndicator={false}
        />
      </FlashListContainer>
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
