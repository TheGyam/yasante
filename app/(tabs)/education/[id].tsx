import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import styled from 'styled-components/native';
import { X, Heart, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useContentItem } from '@/api/hooks/useContent';
import { useToggleFavorite, useIsFavorite } from '@/api/hooks/useContent';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import { SharedElement } from 'react-native-shared-element';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import type { Theme } from '@/theme/ThemeProvider';

const ScreenContainer = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const Header = styled.View<{ topInset: number }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ topInset, theme }: { topInset: number; theme: Theme }) => topInset + theme.spacing[3]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const CloseButton = styled(TouchableOpacity)`
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


const FavoriteButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
`;

const Content = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-top: 0;
`;

const ArticleTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const ReviewedBySection = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const ReviewerInfo = styled.View`
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  flex: 1;
`;

const ReviewerName = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const ReviewerCredentials = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const IllustrationCard = styled.View`
  width: 100%;
  height: 280px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.large}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surfaceVariant};
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

const ArticleBody = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  width: 100%;
`;

const Paragraph = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  line-height: 24px;
`;

const SubHeading = styled(Text)`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const AvatarContainer = styled.View`
  position: relative;
`;

const VerifiedBadge = styled.View`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #10b981;
  border-width: 2px;
  border-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  align-items: center;
  justify-content: center;
`;

export default function ContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { data: content, isLoading } = useContentItem(id || '');
  
  const userId = user?.id;
  const { data: isFavorite = false } = useIsFavorite(userId || '', id || '', { enabled: !!userId });
  const toggleFavorite = useToggleFavorite(userId || '');

  // Parse article content - must be before early return (Rules of Hooks)
  const articleText = content?.articleContent || content?.description || 'No content available.';
  
  const articleParts = React.useMemo(() => {
    if (!articleText) return [];
    
    const parts: Array<{ type: 'paragraph' | 'subheading'; content: string }> = [];
    // Split by double newlines to get paragraphs
    const paragraphs = articleText.split(/\n\s*\n/).filter((p) => p.trim());
    
    paragraphs.forEach((para) => {
      const trimmed = para.trim();
      // Check if this looks like a subheading (short, title case, no punctuation)
      const isSubHeading = 
        trimmed.length < 80 && 
        trimmed.length > 0 &&
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed) &&
        !trimmed.endsWith('.') &&
        !trimmed.endsWith('?') &&
        !trimmed.endsWith('!');
      
      if (isSubHeading) {
        parts.push({ type: 'subheading', content: trimmed });
      } else {
        parts.push({ type: 'paragraph', content: trimmed });
      }
    });
    
    // If no parts were created, add the whole text as a paragraph
    if (parts.length === 0 && articleText) {
      parts.push({ type: 'paragraph', content: articleText });
    }
    
    return parts;
  }, [articleText]);

  // Debug: Log content to verify data is loading (must be before early return)
  React.useEffect(() => {
    if (content) {
      console.log('Content loaded:', {
        id: content.id,
        title: content.title,
        hasArticleContent: !!content.articleContent,
        articleContentLength: content.articleContent?.length || 0,
      });
    }
  }, [content?.id, content?.articleContent]);
  
  // Debug: Log parsing results (must be before early return)
  React.useEffect(() => {
    if (content && articleText) {
      console.log('Article parsing:', {
        articleTextLength: articleText.length,
        articlePartsCount: articleParts.length,
        firstPart: articleParts[0]?.type,
        firstPartLength: articleParts[0]?.content?.length,
      });
    }
  }, [content?.id, articleText, articleParts.length]);

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    
    if (id && userId) {
      toggleFavorite.mutate(id);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (isLoading || !content) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Mock reviewer data - in real app this would come from content.author
  const reviewer = {
    name: 'Dr. Anna Targonskaya',
    credentials: 'Obstetrician and gynecologist, 5+ years in obstetrics, gynecology, and digital health',
    avatar: null,
  };

  return (
    <ScreenContainer>
      <Container
        testID="content-detail-screen"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          flexGrow: 1,
        }}
      >
        <Header topInset={insets.top}>
          <CloseButton onPress={handleClose} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
          </CloseButton>
          <View style={{ flex: 1 }} />
          <FavoriteButton onPress={handleToggleFavorite} activeOpacity={0.7}>
            <Heart
              size={24}
              color={isFavorite ? theme.colors.primary : theme.colors.text.medium}
              fill={isFavorite ? theme.colors.primary : 'none'}
              strokeWidth={2.5}
            />
          </FavoriteButton>
        </Header>

        <Content>
          <ArticleTitle variant="h1" weight="bold">
            {content.title}
          </ArticleTitle>

          <ReviewedBySection>
            <AvatarContainer>
              <Avatar size={48} name={reviewer.name.split(' ').map((n) => n[0]).join('')} />
              <VerifiedBadge>
                <Text variant="caption" color="#fff" style={{ fontSize: 10 }}>
                  ✓
                </Text>
              </VerifiedBadge>
            </AvatarContainer>
            <ReviewerInfo>
              <Text variant="caption" color={theme.colors.text.low} style={{ marginBottom: 4 }}>
                Reviewed By
              </Text>
              <ReviewerName variant="body" weight="semibold">
                {reviewer.name}
              </ReviewerName>
              <ReviewerCredentials variant="caption" color={theme.colors.text.medium} numberOfLines={2}>
                {reviewer.credentials}
              </ReviewerCredentials>
            </ReviewerInfo>
          </ReviewedBySection>

          <IllustrationCard>
            {content.thumbnailUri ? (
              <View style={{ width: '100%', height: 280 }}>
                <SharedElement id={`media.${content.id}`}>
                  {content.type === 'video' && content.videoUri ? (
                    <VideoPlayer
                      source={{ uri: content.videoUri }}
                      poster={content.thumbnailUri}
                      autoPlay={false}
                    />
                  ) : (
                    <ImageWithPlaceholder
                      source={{ uri: content.thumbnailUri }}
                      style={{ width: '100%', height: 280 }}
                      resizeMode="cover"
                    />
                  )}
                </SharedElement>
              </View>
            ) : (
              <View style={{ width: '100%', height: 280, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="body" color={theme.colors.text.low}>
                  Illustration
                </Text>
              </View>
            )}
          </IllustrationCard>

          <ArticleBody>
            {articleParts.length > 0 ? (
              <>
                {articleParts.map((part, index) => {
                  if (part.type === 'subheading') {
                    return (
                      <SubHeading key={`subheading-${index}`} variant="h3" weight="bold">
                        {part.content}
                      </SubHeading>
                    );
                  }
                  
                  return (
                    <Paragraph key={`paragraph-${index}`} variant="body" color={theme.colors.text.high}>
                      {part.content}
                    </Paragraph>
                  );
                })}
              </>
            ) : (
              <View style={{ padding: theme.spacing[4] }}>
                <Paragraph variant="body" color={theme.colors.text.medium}>
                  {content.description || 'No content available.'}
                </Paragraph>
                <Paragraph variant="caption" color={theme.colors.text.low} style={{ marginTop: theme.spacing[2] }}>
                  Debug: articleParts.length = {articleParts.length}, articleText length = {articleText.length}
                </Paragraph>
              </View>
            )}

            {/* Inline image section for articles */}
            {content.type === 'article' && content.thumbnailUri && (
              <View style={{ marginTop: theme.spacing[5], marginBottom: theme.spacing[4] }}>
                <IllustrationCard>
                  <SharedElement id={`media.${content.id}.inline`}>
                    <ImageWithPlaceholder
                      source={{ uri: content.thumbnailUri }}
                      style={{ width: '100%', height: 280 }}
                      resizeMode="cover"
                    />
                  </SharedElement>
                </IllustrationCard>
              </View>
            )}

            {content.type === 'video' && content.videoUri && (
              <View style={{ marginTop: theme.spacing[5], marginBottom: theme.spacing[4] }}>
                <VideoPlayer source={{ uri: content.videoUri }} autoPlay={false} />
              </View>
            )}
          </ArticleBody>
        </Content>
      </Container>
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        feature="favorites"
      />
    </ScreenContainer>
  );
}
