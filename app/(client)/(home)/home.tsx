import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { useScrollToTop } from '@react-navigation/native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Camera, Search, Sparkles, WifiOff } from 'lucide-react-native';
import { AuthPromptModal, GreetingBanner, useAuth } from '@/features/auth';
import { BookingNudge } from '@/features/booking';
import { TipOfTheDay } from '@/features/education';
import {
  LookFilterBar,
  LookTile,
  useFeedQuery,
  useLookActions,
  useLookFilters,
  useLooks,
  useRefreshLooks,
  type Look,
} from '@/features/looks';
import { useUser } from '@/features/profile';
import { GUTTER, makeStyles, radius, space, timing, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
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
  skeletons: { flexDirection: 'row', gap: space.sm + 2 },
  skeletonColumn: { flex: 1, gap: space.sm + 2 },
  footer: { paddingVertical: space.xxl },
  fallback: { gap: space.lg, marginHorizontal: CARD_INSET },
  fallbackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fallbackCell: { width: '50%' },
}));

export default function HomeScreen() {
  const router = useRouter();
  return (
    <Screen
      scroll="list"
      testID="home-screen"
      headerRight={
        <IconButton
          icon={Search}
          accessibilityLabel="Search"
          size={36}
          onPress={() => router.push('/search')}
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

/** Dims a tile while a new filter loads, from one shared value — no re-renders. */
function Dim({ opacity, children }: { opacity: SharedValue<number>; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * Home is the looks people post: real hair, and who did it. Everything in the
 * grid was put up by someone on Yasante — a stylist's work, or a client's hair.
 */
function HomeFeed() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const listRef = useRef<FlashListRef<Look>>(null);
  useScrollToTop(listRef);

  const { user: authUser, isAuthenticated } = useAuth();
  const { data: user } = useUser(authUser?.id, { enabled: !!authUser?.id });
  const firstName = user?.name?.split(' ')[0];

  const [authPrompt, setAuthPrompt] = useState(false);
  const actions = useLookActions({ onNeedsAccount: () => setAuthPrompt(true) });

  const { query, filtered } = useFeedQuery();
  const clearFilters = useLookFilters(s => s.clear);
  const feed = useLooks(query);
  const refresh = useRefreshLooks();
  // One array per fetch, not per render: the list re-diffs whenever this changes.
  const looks = useMemo(() => feed.data?.pages.flatMap(page => page.data) ?? [], [feed.data]);
  const emptyFiltered = filtered && !feed.isLoading && !feed.isPlaceholderData && !looks.length;
  // Nothing matched: rather than a blank page, the latest looks still show below.
  const fallback = useLooks({}, { enabled: emptyFiltered });
  const fallbackLooks = (fallback.data?.pages[0]?.data ?? []).slice(0, 6);

  // Old results stay up, dimmed, while a new filter loads.
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withTiming(feed.isPlaceholderData ? 0.45 : 1, timing.state));
  }, [feed.isPlaceholderData, opacity]);

  const tile = useCallback(
    (look: Look) => (
      <LookTile
        look={look}
        onOpen={actions.onOpen}
        onLike={actions.onLike}
        onSave={look.mine ? undefined : actions.onSave}
      />
    ),
    [actions]
  );
  const renderItem = useCallback(
    ({ item }: { item: Look }) => <Dim opacity={opacity}>{tile(item)}</Dim>,
    [opacity, tile]
  );

  const header = (
    <View style={styles.header}>
      <GreetingBanner firstName={firstName} />
      {isAuthenticated && <BookingNudge />}
      <SearchField
        placeholder="Search styles, tips and care"
        onPress={() => router.push('/search')}
      />
      <TipOfTheDay />
      <View style={styles.feedHead}>
        <SectionHeader title="Looks" />
        <LookFilterBar />
        <Button
          label="Post a look"
          icon={Camera}
          variant="secondary"
          onPress={() => (isAuthenticated ? router.push('/looks/new') : setAuthPrompt(true))}
          fullWidth
          testID="home-post-look"
        />
      </View>
      {feed.isLoading && <FeedSkeleton />}
    </View>
  );

  return (
    <>
      <AnimatedFlashList
        ref={listRef}
        data={feed.isLoading ? [] : looks}
        masonry
        numColumns={2}
        keyExtractor={look => look.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          feed.isLoading ? null : feed.isError ? (
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
                icon={Sparkles}
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
              icon={Sparkles}
              title="No looks yet"
              message="When people post their hair, it shows up here."
            />
          )
        }
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
      <AuthPromptModal
        visible={authPrompt}
        onClose={() => setAuthPrompt(false)}
        feature="favorites"
      />
    </>
  );
}
