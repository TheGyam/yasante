import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { useScrollToTop, useIsFocused } from '@react-navigation/native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Images, Plus, Search, SearchX, WifiOff } from 'lucide-react-native';
import { AuthPromptModal, GreetingBanner, useAuth } from '@/features/auth';
import { BookingNudge } from '@/features/booking';
import { SuggestedStylists } from '@/features/stylist';
import { TipOfTheDay } from '@/features/education';
import {
  FeedOrderSwitch,
  LookTile,
  useFeedQuery,
  useFeedTracking,
  useLookActions,
  useLookFilters,
  useLooks,
  useFreshFeedOnReturn,
  useRefreshLooks,
  type Look,
} from '@/features/looks';
import { NudgeHost, useUser } from '@/features/profile';
import { GUTTER, makeStyles, radius, space, useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { FEED_LIST, ListFooter } from '@/shared/ui/ListFooter';
import { Screen, useScreenScrollHandler } from '@/shared/ui/Screen';
import { SearchField } from '@/shared/ui/SearchField';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

// FlashList driven by a UI-thread scroll handler, so the header fades without renders.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

/** Horizontal padding each tile carries; the list gutter makes up the rest. */
const CARD_INSET = space.xs + 1;

const useStyles = makeStyles(() => ({
  header: { gap: space.xl, marginHorizontal: CARD_INSET, marginBottom: space.md },
  feedHead: { gap: space.md },
  looksRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  looksTitle: { flex: 1 },
  order: { width: 184 },
  skeletons: { flexDirection: 'row', gap: space.sm + 2 },
  skeletonColumn: { flex: 1, gap: space.sm + 2 },
  footer: { paddingVertical: space.xxl },
  fallback: { gap: space.lg, marginHorizontal: CARD_INSET },
  fallbackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fallbackCell: { width: '50%' },
}));

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  // One place for the "you need an account" prompt: posting from the bar, or
  // liking and saving in the grid.
  const [authPrompt, setAuthPrompt] = useState(false);
  return (
    <Screen
      scroll="list"
      testID="home-screen"
      headerRight={
        <>
          <IconButton
            icon={Search}
            accessibilityLabel="Search"
            size={36}
            onPress={() => router.push('/search')}
          />
          <IconButton
            icon={Plus}
            variant="accent"
            accessibilityLabel="Post a look"
            size={36}
            onPress={() => (isAuthenticated ? router.push('/looks/new') : setAuthPrompt(true))}
            testID="home-post-look"
          />
        </>
      }
    >
      <HomeFeed onNeedsAccount={() => setAuthPrompt(true)} />
      <AuthPromptModal
        visible={authPrompt}
        onClose={() => setAuthPrompt(false)}
        feature="favorites"
      />
      {/* The occasional question about their hair, asked once the feed has settled. */}
      {isAuthenticated && <NudgeHost />}
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

/**
 * Home is the looks people post: real hair, and who did it. Everything in the
 * grid was put up by someone on Yasante — a stylist's work, or a client's hair.
 */
function HomeFeed({ onNeedsAccount }: { onNeedsAccount: () => void }) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const listRef = useRef<FlashListRef<Look>>(null);
  useScrollToTop(listRef);
  useFreshFeedOnReturn(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));

  const { user: authUser, isAuthenticated } = useAuth();
  const { data: user } = useUser(authUser?.id, { enabled: !!authUser?.id });
  // The name saved with the sign-in first, so the greeting doesn't flip from
  // "there" to her name once the profile arrives; the profile wins if it's newer.
  const firstName = (user?.name ?? authUser?.name)?.split(' ')[0];

  const actions = useLookActions({ onNeedsAccount });

  const { query, filtered, ready } = useFeedQuery({ withFilters: false });
  const clearFilters = useLookFilters(s => s.clear);
  const feed = useLooks(query, { enabled: ready });
  // Waiting for her recent searches counts as loading: the feed loads once, in order.
  const feedLoading = feed.isLoading || !ready;
  const focused = useIsFocused();
  const refresh = useRefreshLooks();
  // One array per fetch, not per render: the list re-diffs whenever this changes.
  const looks = useMemo(() => feed.data?.pages.flatMap(page => page.data) ?? [], [feed.data]);
  // While the ranked feed is on for her, what she sees and opens here is recorded.
  const tracking = useFeedTracking(feed.data?.pages[0]?.session, 'home', looks, actions.onOpen);
  const emptyFiltered = filtered && !feedLoading && !feed.isPlaceholderData && !looks.length;
  // Nothing matched: rather than a blank page, the latest looks still show below.
  const fallback = useLooks({}, { enabled: emptyFiltered });
  const fallbackLooks = (fallback.data?.pages[0]?.data ?? []).slice(0, 6);

  // Old results stay up, dimmed, while a new filter loads. Rare, so re-rendering the
  // tiles then is cheaper than an animated wrapper around every tile while scrolling.
  const dimmed = feed.isPlaceholderData;

  const tile = useCallback(
    (look: Look) => (
      <LookTile
        look={look}
        onOpen={tracking.onOpen}
        onLike={actions.onLike}
        onSave={look.mine ? undefined : actions.onSave}
        onFindStylists={actions.onFindStylists}
        dimmed={dimmed}
      />
    ),
    [actions, dimmed, tracking.onOpen]
  );
  const renderItem = useCallback(({ item }: { item: Look }) => tile(item), [tile]);

  // Built only when what's in it changes: the list re-renders its header otherwise.
  const loading = feedLoading;
  const header = useMemo(
    () => (
      <View style={styles.header}>
        <GreetingBanner firstName={firstName} />
        {isAuthenticated && <BookingNudge />}
        <SearchField
          placeholder="Search looks, stylists and tips"
          onPress={() => router.push('/search')}
        />
        <TipOfTheDay />
        {isAuthenticated && <SuggestedStylists />}
        <View style={styles.feedHead}>
          <View style={styles.looksRow}>
            <View style={styles.looksTitle}>
              <SectionHeader title="Looks" />
            </View>
            <View style={styles.order}>
              <FeedOrderSwitch />
            </View>
          </View>
        </View>
        {loading && <FeedSkeleton />}
      </View>
    ),
    [styles, firstName, isAuthenticated, router, loading]
  );

  return (
    <>
      <AnimatedFlashList
        ref={listRef}
        data={feedLoading ? [] : looks}
        masonry
        numColumns={2}
        keyExtractor={look => look.id}
        renderItem={renderItem}
        onViewableItemsChanged={tracking.onViewableItemsChanged}
        viewabilityConfig={tracking.viewabilityConfig}
        ListHeaderComponent={header}
        ListEmptyComponent={
          feedLoading ? null : feed.isError ? (
            <EmptyState
              icon={WifiOff}
              title="Couldn’t load looks"
              message="Check your connection and try again."
              actionLabel="Try again"
              onAction={() => feed.refetch()}
            />
          ) : emptyFiltered ? (
            <View style={styles.fallback}>
              <EmptyState
                icon={SearchX}
                title="Nothing matches yet"
                message="Looks are added every day. Here’s the latest in the meantime."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
              {fallbackLooks.length > 0 && (
                <Text variant="overline" tone="tertiary">
                  Latest looks
                </Text>
              )}
              <View style={styles.fallbackGrid}>
                {fallbackLooks.map(look => (
                  <View key={look.id} style={styles.fallbackCell}>
                    {tile(look)}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <EmptyState
              icon={Images}
              title="No looks yet"
              message="When people post their hair, it shows up here."
            />
          )
        }
        ListFooterComponent={<ListFooter more={!!feed.hasNextPage} />}
        onEndReached={() => {
          // A screen covered by another reports it's at the end; only the visible one loads more.
          if (focused && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        onEndReachedThreshold={FEED_LIST.onEndReachedThreshold}
        drawDistance={FEED_LIST.drawDistance}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage && !feed.isPlaceholderData}
            onRefresh={refresh}
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
    </>
  );
}
