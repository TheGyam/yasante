import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Bookmark } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { ContentRow, useContent, useFavorites, type Content } from '@/features/education';
import { useRouter } from '@/shared/lib/navigation';
import { GUTTER, makeStyles, space, useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadError } from '@/shared/ui/LoadError';
import { useContentInsets } from '@/shared/ui/layout';
import { Screen, ScreenTitle, useScreenScrollHandler } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';

type Filter = 'all' | 'inspo' | 'learn';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'inspo', label: 'Inspiration' },
  { value: 'learn', label: 'Learn' },
] as const;

const INSPO_TOPICS = new Set(['styling', 'tips']);
const PAGE_SIZE = 50;

// Virtualised, so a few hundred saved items cost the same as a few.
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList
) as unknown as typeof FlashList;

const useStyles = makeStyles(() => ({
  header: { gap: space.xl, marginBottom: space.md },
}));

export default function SavedScreen() {
  return (
    <Screen title="Saved articles" back scroll="list" testID="favorites-screen">
      <SavedList />
    </Screen>
  );
}

function SavedList() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const insets = useContentInsets();
  const onScroll = useScreenScrollHandler();
  const { user } = useAuth();
  const favorites = useFavorites(user?.id);
  // The server sends each saved article with it; older ones are looked up in a page.
  const needsLookup = !!favorites.data?.some(fav => !fav.content);
  const content = useContent({ limit: PAGE_SIZE }, { enabled: needsLookup });
  const [filter, setFilter] = useState<Filter>('all');

  const byId = new Map((content.data?.data ?? []).map(item => [item.id, item]));
  const saved = (favorites.data ?? [])
    .map(fav => fav.content ?? byId.get(fav.contentId))
    .filter((item): item is Content => !!item)
    .filter(item => filter === 'all' || INSPO_TOPICS.has(item.topic) === (filter === 'inspo'));

  const loading = favorites.isLoading || (needsLookup && content.isLoading);
  const open = (item: Content) => router.push(`/content/${item.id}`);

  const header = (
    <View style={styles.header}>
      <ScreenTitle title="Saved articles" />
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      {loading && <Skeleton height={240} />}
    </View>
  );

  return (
    <AnimatedFlashList
      data={loading ? [] : saved}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <ContentRow content={item} onPress={open} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? null : favorites.isError && !favorites.data ? (
          <LoadError
            what="your saved articles"
            error={favorites.error}
            onRetry={() => favorites.refetch()}
            retrying={favorites.isRefetching}
          />
        ) : (
          <EmptyState
            icon={Bookmark}
            title="No saved articles yet"
            message="Tap the bookmark on any article to keep it here. Looks you save go into your collections."
            actionLabel="Browse articles"
            onAction={() => router.push('/learn')}
          />
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={favorites.isRefetching}
          onRefresh={() => favorites.refetch()}
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
