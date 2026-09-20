import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Camera, Sparkles, WifiOff } from 'lucide-react-native';
import { LookCard, useLooks, type Look } from '@/features/looks';
import { useActiveMode } from '@/features/stylist';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useContentInsets } from '@/shared/ui/layout';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { Skeleton } from '@/shared/ui/Skeleton';

// One column, virtualised: the feed grows for as long as people post.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(() => ({
  header: { gap: space.lg, marginBottom: space.lg },
  skeletons: { gap: space.xxl },
  footer: { paddingVertical: space.xxl },
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
  const feed = useLooks();
  const mode = useActiveMode();

  const looks = feed.data?.pages.flatMap(page => page.data) ?? [];

  const header = (
    <View style={styles.header}>
      <ScreenTitle title="Looks" subtitle="Real work, by the people who did it" />
      {mode === 'stylist' && (
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

  // Tapping through to her page waits for the page itself to exist — a link to a
  // screen that isn't built is worse than a name you can't tap.
  const openOptions = (look: Look) =>
    router.push(
      `/looks/options?id=${look.id}&author=${encodeURIComponent(look.authorName)}&authorId=${look.authorId}&mine=${look.mine ? 1 : 0}`
    );

  return (
    <AnimatedFlashList
      data={feed.isLoading ? [] : looks}
      keyExtractor={look => look.id}
      renderItem={({ item }) => <LookCard look={item} onMore={openOptions} />}
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
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No looks yet"
            message="When stylists post their work, it shows up here."
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
        paddingHorizontal: GUTTER,
      }}
    />
  );
}
