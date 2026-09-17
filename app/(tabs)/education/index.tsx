import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Droplets } from 'lucide-react-native';
import {
  ContentCarousel,
  ContentRow,
  TOPIC_LABELS,
  TOPIC_ORDER,
  useContent,
  type Content,
  type ContentTopic,
} from '@/features/education';
import { GUTTER, makeStyles, radius, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Skeleton } from '@/shared/ui/Skeleton';

const useStyles = makeStyles(() => ({
  body: { gap: space.xxl },
  chips: { marginHorizontal: -GUTTER },
  chipsContent: { paddingHorizontal: GUTTER, gap: space.sm },
  loading: { flexDirection: 'row', gap: space.md },
}));

export default function LearnScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useContent();
  const [topic, setTopic] = useState<ContentTopic | null>(null);

  const byTopic = new Map<ContentTopic, Content[]>();
  for (const item of data?.data ?? []) {
    const list = byTopic.get(item.topic);
    if (list) list.push(item);
    else byTopic.set(item.topic, [item]);
  }
  const topics = TOPIC_ORDER.filter(t => byTopic.has(t));
  const open = (content: Content) => router.push(`/(tabs)/education/${content.id}`);

  return (
    <Screen
      back
      title="Learn"
      subtitle="Care, growth and styling, explained"
      refreshing={isRefetching}
      onRefresh={refetch}
      testID="education-screen"
    >
      <View style={styles.body}>
        <Section>
          <ListRow
            title="Find your hair type"
            subtitle="Two minutes, and everything here gets more useful"
            icon={Droplets}
            iconTone="accent"
            onPress={() => router.push('/onboarding/quiz')}
          />
        </Section>

        {topics.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chips}
            contentContainerStyle={styles.chipsContent}
          >
            <Chip label="All" selected={topic === null} onPress={() => setTopic(null)} />
            {topics.map(t => (
              <Chip
                key={t}
                label={TOPIC_LABELS[t]}
                selected={topic === t}
                onPress={() => setTopic(t)}
              />
            ))}
          </ScrollView>
        )}

        {isLoading ? (
          <View style={styles.loading}>
            <Skeleton width={200} height={290} radius={radius.lg} />
            <Skeleton width={200} height={290} radius={radius.lg} />
          </View>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nothing here yet"
            message="New guides are on the way. Pull down to check again."
          />
        ) : topic ? (
          <View>
            {byTopic.get(topic)?.map(item => (
              <ContentRow key={item.id} content={item} onPress={open} />
            ))}
          </View>
        ) : (
          topics.map(t => (
            <ContentCarousel
              key={t}
              title={TOPIC_LABELS[t]}
              items={byTopic.get(t)!}
              onPress={open}
              actionLabel="See all"
              onAction={() => setTopic(t)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}
