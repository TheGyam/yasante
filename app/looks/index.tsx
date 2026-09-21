import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Camera, ChevronDown, MapPin, Sparkles, WifiOff } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import {
  LookCard,
  useLookActions,
  useLookAreas,
  useLookFilters,
  useLooks,
  useStyleTaxonomy,
  type Look,
} from '@/features/looks';
import { useUser, useUserStore } from '@/features/profile';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space, timing, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { confirm } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
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
  return (
    <Screen title="Looks" back scroll="list" testID="looks-screen">
      <LooksFeed />
    </Screen>
  );
}

function LooksFeed() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const actions = useLookActions();
  const listRef = useRef<FlashListRef<Look>>(null);

  const { user } = useAuth();
  const { data: account } = useUser(user?.id);
  const localHair = useUserStore(s => s.hairProfile);
  const texture = account?.hairProfile?.texture ?? localHair?.texture;

  const filters = useLookFilters();
  const { data: taxonomy = [] } = useStyleTaxonomy();
  useLookAreas(); // warmed now, so the area picker opens full

  const query = {
    hair: filters.hairLikeMine ? texture : undefined,
    style: filters.style,
    area: filters.area,
  };
  const filtered = !!(query.hair || query.style || query.area);
  const feed = useLooks(query);
  const looks = feed.data?.pages.flatMap(page => page.data) ?? [];
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

  const toggleHair = async () => {
    if (filters.hairLikeMine) return filters.setHairLikeMine(false);
    if (texture) return filters.setHairLikeMine(true);
    const go = await confirm({
      title: 'Tell us about your hair first',
      message: 'Your curl pattern is what "hair like mine" matches on. It takes a moment.',
      confirmLabel: 'Add it',
    });
    if (go) router.push('/hair-profile/texture');
  };

  const card = (look: Look) => (
    <LookCard look={look} {...actions} onSave={look.mine ? undefined : actions.onSave} />
  );

  const header = (
    <View style={styles.header}>
      <ScreenTitle title="Looks" subtitle="Real work, by the people who did it" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filterRow}
      >
        <Chip
          label="Hair like mine"
          icon={Sparkles}
          selected={filters.hairLikeMine && !!texture}
          onPress={toggleHair}
        />
        <Chip
          label={filters.area ?? 'Anywhere'}
          icon={filters.area ? MapPin : ChevronDown}
          selected={!!filters.area}
          onPress={() => router.push('/looks/area')}
          accessibilityLabel={`Area: ${filters.area ?? 'anywhere'}`}
        />
        {taxonomy.map(style => (
          <Chip
            key={style.id}
            label={style.name}
            selected={filters.style === style.id}
            onPress={() => filters.setStyle(filters.style === style.id ? undefined : style.id)}
          />
        ))}
      </ScrollView>
      {!!user && (
        <Button
          label="Post a look"
          icon={Camera}
          variant="secondary"
          onPress={() => router.push('/looks/new')}
          fullWidth
          testID="looks-post"
        />
      )}
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
      renderItem={({ item }) => <Dim opacity={opacity}>{card(item)}</Dim>}
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
              icon={Sparkles}
              title="Nothing matches yet"
              message="Looks are added every day. Here’s the latest in the meantime."
              actionLabel="Clear filters"
              onAction={filters.clear}
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
          onRefresh={() => feed.refetch()}
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
