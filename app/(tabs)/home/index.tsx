import { useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { ArrowUp, Search, WifiOff } from 'lucide-react-native';
import { AuthPromptModal, GreetingBanner, useAuth } from '@/features/auth';
import {
  ContentCarousel,
  InspoCard,
  TipOfTheDay,
  prefetchContentItem,
  prefetchRelatedContent,
  useInfiniteContent,
  useNewPosts,
  type Content,
} from '@/features/education';
import { SaveToBoardSheet } from '@/features/planner';
import { useUser } from '@/features/profile';
import { useBackgroundSync } from '@/shared/hooks/useBackgroundSync';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { Screen, useScreenScrollHandler } from '@/shared/ui/Screen';
import { SearchField } from '@/shared/ui/SearchField';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

// FlashList driven by a UI-thread scroll handler, so the header fades without renders.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

/** Horizontal padding each feed card carries; the list gutter makes up the rest. */
const CARD_INSET = space.xs + 1;
const CAROUSEL_TOPICS = new Set(['tips', 'care', 'styling']);

const useStyles = makeStyles(() => ({
  header: { gap: space.xxl, marginHorizontal: CARD_INSET, marginBottom: space.md },
  skeletons: { flexDirection: 'row', gap: space.sm + 2, marginHorizontal: CARD_INSET },
  skeletonColumn: { flex: 1, gap: space.sm + 2 },
  footer: { paddingVertical: space.xxl },
}));

export default function HomeScreen() {
  const router = useRouter();
  return (
    <Screen
      scroll="list"
      tabBar
      testID="home-screen"
      headerRight={
        <IconButton
          icon={Search}
          accessibilityLabel="Search"
          size={36}
          onPress={() => router.push('/(tabs)/home/search')}
        />
      }
    >
      <HomeFeed />
    </Screen>
  );
}

function FeedSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.skeletons}>
      <View style={styles.skeletonColumn}>
        <Skeleton height={230} radius={radius.lg} />
        <Skeleton height={180} radius={radius.lg} />
      </View>
      <View style={styles.skeletonColumn}>
        <Skeleton height={180} radius={radius.lg} />
        <Skeleton height={240} radius={radius.lg} />
      </View>
    </View>
  );
}

function HomeFeed() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useContentInsets({ tabBar: true });
  const onScroll = useScreenScrollHandler();
  const listRef = useRef<FlashListRef<Content>>(null);
  useScrollToTop(listRef);

  const feed = useInfiniteContent();
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: user } = useUser(authUser?.id, { enabled: !!authUser?.id });
  const { hasNewPosts, mergeNewPosts } = useNewPosts({ enabled: true });
  useBackgroundSync({ enabled: true });

  const [authPrompt, setAuthPrompt] = useState(false);
  const [saving, setSaving] = useState<Content | null>(null);

  const items = feed.data?.pages.flatMap(page => page.data) ?? [];
  const carousel = items.filter(item => CAROUSEL_TOPICS.has(item.topic)).slice(0, 10);
  const firstName = user?.name?.split(' ')[0];

  const openInspo = (content: Content) => {
    prefetchContentItem(queryClient, content.id);
    if (content.topic) prefetchRelatedContent(queryClient, content.id, content.topic);
    router.push(`/(tabs)/home/${content.id}`);
  };
  const openArticle = (content: Content) => router.push(`/(tabs)/education/${content.id}`);
  const save = (content: Content) => (isAuthenticated ? setSaving(content) : setAuthPrompt(true));

  const header = (
    <View style={styles.header}>
      <GreetingBanner firstName={firstName} />
      <SearchField
        placeholder="Search styles, tips and care"
        onPress={() => router.push('/(tabs)/home/search')}
      />
      {hasNewPosts && (
        <Button
          label="New posts — show them"
          icon={ArrowUp}
          variant="secondary"
          size="sm"
          onPress={mergeNewPosts}
          style={{ alignSelf: 'center' }}
        />
      )}
      <ContentCarousel
        title="Styles and tips we love"
        items={carousel}
        onPress={openArticle}
        actionLabel="See all"
        onAction={() => router.push('/(tabs)/education')}
      />
      <TipOfTheDay />
      <View>
        <SectionHeader title="Inspiration" />
        {feed.isLoading && <FeedSkeleton />}
        {feed.isError && items.length === 0 && (
          <EmptyState
            icon={WifiOff}
            title="Couldn’t load your feed"
            message="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => feed.refetch()}
          />
        )}
      </View>
    </View>
  );

  return (
    <>
      <AnimatedFlashList
        ref={listRef}
        data={items}
        masonry
        numColumns={2}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <InspoCard content={item} onPress={openInspo} onSave={save} />}
        ListHeaderComponent={header}
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.accent} style={styles.footer} />
          ) : null
        }
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => feed.refetch()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
            progressViewOffset={insets.top}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: GUTTER - CARD_INSET,
        }}
      />
      <AuthPromptModal
        visible={authPrompt}
        onClose={() => setAuthPrompt(false)}
        feature="favorites"
      />
      <SaveToBoardSheet
        visible={!!saving}
        onClose={() => setSaving(null)}
        imageUri={saving?.thumbnailUri}
        title={saving?.title ?? ''}
      />
    </>
  );
}
