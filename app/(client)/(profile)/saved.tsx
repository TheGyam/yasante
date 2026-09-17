import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { useAuth } from '@/features/auth';
import { ContentRow, useContent, useFavorites, type Content } from '@/features/education';
import { makeStyles, space } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Screen } from '@/shared/ui/Screen';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Skeleton } from '@/shared/ui/Skeleton';

type Filter = 'all' | 'inspo' | 'learn';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'inspo', label: 'Inspiration' },
  { value: 'learn', label: 'Learn' },
] as const;

const INSPO_TOPICS = new Set(['styling', 'tips']);

const useStyles = makeStyles(() => ({
  body: { gap: space.xl },
}));

export default function SavedScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { user } = useAuth();
  const favorites = useFavorites(user?.id);
  const content = useContent();
  const [filter, setFilter] = useState<Filter>('all');

  const byId = new Map((content.data?.data ?? []).map(item => [item.id, item]));
  const saved = (favorites.data ?? [])
    .map(fav => byId.get(fav.contentId))
    .filter((item): item is Content => !!item)
    .filter(item => filter === 'all' || INSPO_TOPICS.has(item.topic) === (filter === 'inspo'));

  const open = (item: Content) => router.push(`/content/${item.id}`);

  return (
    <Screen
      title="Saved"
      back
      refreshing={favorites.isRefetching}
      onRefresh={() => favorites.refetch()}
      testID="favorites-screen"
    >
      <View style={styles.body}>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
        {favorites.isLoading || content.isLoading ? (
          <Skeleton height={240} />
        ) : saved.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            message="Tap the bookmark on any style or article to keep it here."
            actionLabel="Browse styles"
            onAction={() => router.navigate('/home')}
          />
        ) : (
          <View>
            {saved.map(item => (
              <ContentRow key={item.id} content={item} onPress={open} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
