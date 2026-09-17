import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, BookmarkCheck, LayoutGrid, Share, WifiOff } from 'lucide-react-native';
import { AuthPromptModal, useAuth } from '@/features/auth';
import { SaveToBoardSheet } from '@/features/planner';
import { makeStyles, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Screen } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { VideoPlayer } from '@/shared/ui/VideoPlayer';
import { TOPIC_LABELS, shareContent } from '../content';
import { useContentItem, useIsFavorite, useRelatedContent, useToggleFavorite } from '../hooks';
import type { Content } from '../types';
import { ArticleBody } from './ArticleBody';
import { ContentCarousel } from './ContentCarousel';

export interface ContentDetailProps {
  id: string;
}

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  media: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.xl, overflow: 'hidden' },
  video: { width: '100%', aspectRatio: 16 / 9 },
  heading: { gap: space.sm },
}));

function metaLine(content: Content) {
  const parts = [TOPIC_LABELS[content.topic] ?? content.topic];
  if (content.duration)
    parts.push(`${content.duration} min${content.type === 'video' ? '' : ' read'}`);
  return parts.join(' · ');
}

/** Detail for any piece of content — inspiration, article or video. */
export function ContentDetail({ id }: ContentDetailProps) {
  const styles = useStyles();
  const router = useRouter();
  const { data: content, isLoading, isError, refetch } = useContentItem(id);
  const { user, isAuthenticated } = useAuth();
  const { data: isFavorite = false } = useIsFavorite(user?.id, id, { enabled: isAuthenticated });
  const toggleFavorite = useToggleFavorite(user?.id);
  const related = useRelatedContent(id, content?.topic ?? '', { enabled: !!content });

  const [authPrompt, setAuthPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  const requireAccount = (action: () => void) => (isAuthenticated ? action() : setAuthPrompt(true));
  const relatedItems = related.data?.pages.flatMap(page => page.data).slice(0, 12) ?? [];

  const headerRight = content && (
    <>
      <IconButton
        icon={Share}
        accessibilityLabel="Share"
        size={36}
        onPress={() => shareContent(content)}
      />
      <IconButton
        icon={isFavorite ? BookmarkCheck : Bookmark}
        accessibilityLabel={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
        accessibilityState={{ selected: isFavorite }}
        variant={isFavorite ? 'accent' : 'glass'}
        size={36}
        haptic={isFavorite ? 'light' : 'success'}
        onPress={() => requireAccount(() => toggleFavorite.mutate(id))}
      />
    </>
  );

  return (
    <>
      <Screen back headerRight={headerRight} testID="content-detail">
        {isLoading ? (
          <View style={styles.body}>
            <Skeleton radius={radius.xl} style={styles.media} />
            <Skeleton height={28} width="80%" />
            <Skeleton height={80} />
          </View>
        ) : !content ? (
          <EmptyState
            icon={WifiOff}
            title={isError ? 'Couldn’t load this' : 'Not found'}
            message={isError ? 'Check your connection and try again.' : 'It may have been removed.'}
            actionLabel={isError ? 'Try again' : undefined}
            onAction={isError ? () => refetch() : undefined}
          />
        ) : (
          <View style={styles.body}>
            {content.videoUri ? (
              <VideoPlayer
                uri={content.videoUri}
                poster={content.thumbnailUri}
                style={styles.video}
              />
            ) : (
              <View style={styles.media}>
                <RemoteImage
                  uri={content.thumbnailUri}
                  style={StyleSheet.absoluteFill}
                  accessibilityLabel={content.title}
                  priority="high"
                />
              </View>
            )}

            <View style={styles.heading}>
              <Text variant="overline" tone="tertiary">
                {metaLine(content)}
              </Text>
              <Text variant="title1" accessibilityRole="header">
                {content.title}
              </Text>
              {!!content.author && (
                <Text variant="subhead" tone="secondary">
                  By {content.author}
                </Text>
              )}
            </View>

            <Button
              label="Save to mood board"
              icon={LayoutGrid}
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => requireAccount(() => setSaving(true))}
            />

            {content.articleContent ? (
              <ArticleBody text={content.articleContent} />
            ) : (
              !!content.description && (
                <Text variant="body" tone="secondary">
                  {content.description}
                </Text>
              )
            )}

            <ContentCarousel
              title="More like this"
              items={relatedItems}
              tileWidth={160}
              onPress={next => router.push(`/content/${next.id}`)}
            />
          </View>
        )}
      </Screen>

      <AuthPromptModal
        visible={authPrompt}
        onClose={() => setAuthPrompt(false)}
        feature="favorites"
      />
      <SaveToBoardSheet
        visible={saving}
        onClose={() => setSaving(false)}
        imageUri={content?.thumbnailUri}
        title={content?.title ?? ''}
      />
    </>
  );
}
