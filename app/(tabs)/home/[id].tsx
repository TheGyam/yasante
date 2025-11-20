import React, { useMemo, useState } from 'react';
import { ScrollView, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { ArrowLeft, Bookmark, Share2, MoreHorizontal, LayoutGrid } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useContentItem, useContent } from '@/api/hooks/useContent';
import { useToggleFavorite, useIsFavorite, useFavorites } from '@/api/hooks/useContent';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import { AddToMoodBoardModal } from '@/components/composed/AddToMoodBoardModal';
import { SharedElement } from 'react-native-shared-element';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Header = styled.View<{ topInset: number }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ topInset, theme }: { topInset: number; theme: Theme }) => topInset + theme.spacing[2]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  z-index: 10;
`;

const BackButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
  border-width: 1px;
  border-color: rgba(0, 0, 0, 0.05);
`;

const HeaderRight = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const HeaderButton = styled(TouchableOpacity)`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
`;

const MediaContainer = styled.View<{ height: number }>`
  width: 100%;
  height: ${({ height }: { height: number }) => height}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;

const ContentSection = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ActionsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const LeftActions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const ActionButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const SaveButton = styled(TouchableOpacity)<{ isSaved: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  background-color: ${({ theme, isSaved }: { theme: Theme; isSaved: boolean }) => isSaved ? theme.colors.primary : theme.colors.surface};
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  border-width: ${({ isSaved }: { isSaved: boolean }) => isSaved ? 0 : 1}px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

const SavesCount = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
`;

const MoreToExploreSection = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  padding-top: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }: { theme: Theme }) => theme.colors.border};
`;

const SectionTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const SimilarPostsGrid = styled.View`
  flex-direction: row;
  gap: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const SimilarPostCard = styled(TouchableOpacity)`
  flex: 1;
  aspect-ratio: 0.75;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  overflow: hidden;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
`;


export default function InspoPostDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  // Handle id as string or array (Expo Router can return either)
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Extract original ID (remove the -0, -1, -2 suffix)
  // IDs are in format: content-1-0, content-1-1, etc.
  // We want to extract: content-1
  const originalId = React.useMemo(() => {
    if (!idParam) return '';
    // Split by '-' and remove the last part (the variation index)
    const parts = idParam.split('-');
    if (parts.length > 2) {
      // Remove the last part (variation index) and rejoin
      return parts.slice(0, -1).join('-');
    }
    return idParam;
  }, [idParam]);
  
  // Debug logging
  React.useEffect(() => {
    console.log('InspoPostDetailScreen - id param:', idParam);
    console.log('InspoPostDetailScreen - originalId:', originalId);
  }, [idParam, originalId]);
  
  const { data: content, isLoading, error } = useContentItem(originalId);
  const { data: allContent } = useContent();
  const { isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showAddToMoodBoard, setShowAddToMoodBoard] = useState(false);
  
  const userId = user?.id;
  const { data: favorites } = useFavorites(userId || '', { enabled: !!userId });
  const { data: isFavorite = false } = useIsFavorite(userId || '', originalId, { enabled: !!userId });
  const toggleFavorite = useToggleFavorite(userId || '');
  
  // Calculate saves count (mock - in real app, this would come from API)
  // For now, we'll use a mock number based on content ID
  const savesCount = React.useMemo(() => {
    if (!originalId) return 0;
    // Generate a consistent mock number based on content ID
    const hash = originalId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 100 + (hash % 500); // Random number between 100-600
  }, [originalId]);
  
  // Debug logging for content
  React.useEffect(() => {
    if (content) {
      console.log('InspoPostDetailScreen - content loaded:', content.id, content.title);
    }
    if (error) {
      console.error('InspoPostDetailScreen - error loading content:', error);
    }
  }, [content, error]);

  // Get similar posts (same topic, exclude current)
  const similarPosts = useMemo(() => {
    if (!content || !allContent?.data) return [];
    return allContent.data
      .filter((item) => item.id !== originalId && item.topic === content.topic)
      .slice(0, 2);
  }, [content, allContent?.data, originalId]);

  const handleBack = () => {
    router.back();
  };

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    
    if (originalId && userId) {
      toggleFavorite.mutate(originalId);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share post');
  };

  const handleSave = () => {
    handleToggleFavorite();
  };

  const handleSimilarPostPress = (postId: string) => {
    router.replace(`/(tabs)/home/${postId}` as any);
  };

  if (isLoading) {
    return (
      <Container>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </Container>
    );
  }

  if (error || !content) {
    return (
      <Container>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[4] }}>
          <Text variant="h3" weight="semibold" color={theme.colors.text.high} style={{ marginBottom: theme.spacing[2] }}>
            Post not found
          </Text>
          <Text variant="body" color={theme.colors.text.medium} style={{ marginBottom: theme.spacing[4], textAlign: 'center' }}>
            {error ? 'Unable to load this post. Please try again.' : 'The post you\'re looking for doesn\'t exist.'}
          </Text>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.6}
            style={{ padding: theme.spacing[2] }}
          >
            <Text variant="body" weight="medium" color={theme.colors.primary}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Full-screen media */}
        <MediaContainer height={width * 1.33}>
          <SharedElement id={`media.${idParam}`} onNode={() => {}}>
            {content.type === 'video' && content.videoUri ? (
              <VideoPlayer
                source={{ uri: content.videoUri }}
                poster={content.thumbnailUri}
                autoPlay={false}
              />
            ) : (
              <ImageWithPlaceholder
                source={{ uri: content.thumbnailUri || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=600&fit=crop&q=80' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
          </SharedElement>
        </MediaContainer>

        {/* Header overlay */}
        <Header topInset={insets.top} style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          <BackButton onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
          </BackButton>
          <HeaderRight>
            <HeaderButton onPress={() => {
              if (!isAuthenticated) {
                setShowAuthPrompt(true);
              } else {
                setShowAddToMoodBoard(true);
              }
            }} activeOpacity={0.7}>
              <LayoutGrid size={18} color="#fff" strokeWidth={2.5} />
            </HeaderButton>
            <HeaderButton onPress={handleShare} activeOpacity={0.7}>
              <Share2 size={18} color="#fff" strokeWidth={2.5} />
            </HeaderButton>
            <HeaderButton onPress={handleToggleFavorite} activeOpacity={0.7}>
              <MoreHorizontal size={18} color="#fff" strokeWidth={2.5} />
            </HeaderButton>
          </HeaderRight>
        </Header>

        {/* Content section */}
        <ContentSection>
          {/* Saves count */}
          <SavesCount>
            <Bookmark size={18} color={theme.colors.primary} fill={theme.colors.primary} strokeWidth={2} />
            <Text variant="body" weight="semibold" color={theme.colors.text.high}>
              {savesCount.toLocaleString()} {savesCount === 1 ? 'person has' : 'people have'} saved this inspiration
            </Text>
          </SavesCount>

          {/* Action buttons */}
          <ActionsRow>
            <LeftActions>
              <ActionButton onPress={handleShare} activeOpacity={0.7}>
                <Share2 size={22} color={theme.colors.text.high} strokeWidth={2.5} />
              </ActionButton>
              <ActionButton activeOpacity={0.7}>
                <MoreHorizontal size={22} color={theme.colors.text.high} strokeWidth={2.5} />
              </ActionButton>
            </LeftActions>
            <SaveButton 
              onPress={handleSave} 
              activeOpacity={0.8}
              isSaved={isFavorite}
            >
              <Bookmark 
                size={18} 
                color={isFavorite ? '#fff' : theme.colors.text.high} 
                fill={isFavorite ? '#fff' : 'none'} 
                strokeWidth={2.5} 
              />
              <Text 
                variant="body" 
                weight="semibold" 
                color={isFavorite ? '#fff' : theme.colors.text.high}
              >
                {isFavorite ? 'Saved' : 'Save'}
              </Text>
            </SaveButton>
          </ActionsRow>

          {/* More to explore */}
          {similarPosts.length > 0 && (
            <MoreToExploreSection>
              <SectionTitle variant="h3" weight="bold" color={theme.colors.text.high}>
                More to explore
              </SectionTitle>
              <SimilarPostsGrid>
                {similarPosts.map((post) => (
                  <SimilarPostCard
                    key={post.id}
                    onPress={() => handleSimilarPostPress(`${post.id}-0`)}
                    activeOpacity={0.9}
                  >
                    <ImageWithPlaceholder
                      source={{ uri: post.thumbnailUri || 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop&q=80' }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </SimilarPostCard>
                ))}
              </SimilarPostsGrid>
            </MoreToExploreSection>
        )}
      </ContentSection>
      </ScrollView>
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        feature="favorites"
      />
      {content && (
        <AddToMoodBoardModal
          visible={showAddToMoodBoard}
          onClose={() => setShowAddToMoodBoard(false)}
          inspoTitle={content.title}
          inspoImageUri={content.thumbnailUri}
        />
      )}
    </Container>
  );
}

