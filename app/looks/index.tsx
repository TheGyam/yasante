import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { WifiOff, SearchX, Images, Plus } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  LookCard,
  LookFilterBar,
  useFeedQuery,
  useLookActions,
  useLookFilters,
  useLooks,
  useRefreshLooks,
  type Look,
} from '@/features/looks';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space, timing, useTheme } from '@/shared/theme';
import { IconButton } from '@/shared/ui/IconButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { FEED_LIST, ListFooter } from '@/shared/ui/ListFooter';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { track } from '@/shared/lib/analytics';

// One column, virtualised: the feed grows for as long as people post.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(() => ({
  header: { gap: space.lg, marginBottom: space.lg },
  filters: { marginHorizontal: -GUTTER },
  filterRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: GUTTER },
  skeletons: { gap: space.xxl },
  footer: { paddingVertical: space.xxl },
  fallback: { gap: space.lg },
}));

export default function LooksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  return (
    <Screen
      title="Looks"
      back
      scroll="list"
      testID="looks-screen"
      headerRight={
        user ? (
          <IconButton
            icon={Plus}
            variant="accent"
            accessibilityLabel="Post a look"
            size={36}
            onPress={() => router.push('/looks/new')}
            testID="looks-post"
          />
        ) : undefined
      }
    >
      <LooksFeed />
    </Screen>
  );
}

function LooksFeed() {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const actions = useLookActions();
  const listRef = useRef<FlashListRef<Look>>(null);

  const { query, filtered } = useFeedQuery();
  const clearFilters = useLookFilters(s => s.clear);
  const feed = useLooks(query);
  const refresh = useRefreshLooks();
  const looks = useMemo(() => feed.data?.pages.flatMap(page => page.data) ?? [], [feed.data]);
  const emptyFiltered = filtered && !feed.isLoading && !feed.isPlaceholderData && !looks.length;
  // Nothing matched: rather than a blank page, the latest looks still show below.
  const fallback = useLooks({}, { enabled: emptyFiltered });
  const fallbackLooks = (fallback.data?.pages[0]?.data ?? []).slice(0, 6);

  // A filtered feed is a search: what was asked, and how much came back.
  useEffect(() => {
    if (filtered && !feed.isLoading && !feed.isPlaceholderData) {
      track('search', { surface: 'looks', ...query, results: looks.length });
    }
    // When the results for a new set of filters arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.hair, query.style, query.area, feed.isPlaceholderData, feed.isLoading]);

  // A new filter starts at the top, where the new results are.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [query.hair, query.style, query.area]);

  // Old results stay up, dimmed, while a new filter loads. One shared value, so the
  // rows fade on the UI thread without re-rendering.
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withTiming(feed.isPlaceholderData ? 0.45 : 1, timing.state));
  }, [feed.isPlaceholderData, opacity]);

  const card = useCallback(
    (look: Look) => (
      <LookCard look={look} {...actions} onSave={look.mine ? undefined : actions.onSave} />
    ),
    [actions]
  );
  const renderItem = useCallback(
    ({ item }: { item: Look }) => <Dim opacity={opacity}>{card(item)}</Dim>,
    [opacity, card]
  );

  const header = (
    <View style={styles.header}>
      <ScreenTitle title="Looks" subtitle="Real work, by the people who did it" />
      <LookFilterBar />
      {feed.isLoading && (
        <View style={styles.skeletons}>
          <Skeleton height={320} />
          <Skeleton height={320} />
        </View>
      )}
    </View>
  );

  return (
    <AnimatedFlashList
      ref={listRef}
      data={feed.isLoading ? [] : looks}
      keyExtractor={look => look.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        feed.isLoading ? null : feed.isError ? (
          <EmptyState
            icon={WifiOff}
            title="Couldn’t load the feed"
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
            {fallbackLooks.map(look => (
              <View key={look.id}>{card(look)}</View>
            ))}
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
        if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
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
        paddingHorizontal: GUTTER,
      }}
    />
  );
}

function Dim({ opacity, children }: { opacity: SharedValue<number>; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
