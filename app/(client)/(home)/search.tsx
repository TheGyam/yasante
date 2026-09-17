import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { FlashList } from '@shopify/flash-list';
import { Clock, SearchX, X } from 'lucide-react-native';
import {
  ContentRow,
  TOPIC_LABELS,
  TOPIC_ORDER,
  useContent,
  type Content,
} from '@/features/education';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { GUTTER, makeStyles, space } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { useContentInsets } from '@/shared/ui/layout';
import { ListRow } from '@/shared/ui/ListRow';
import { Screen } from '@/shared/ui/Screen';
import { SearchField } from '@/shared/ui/SearchField';
import { Section } from '@/shared/ui/Section';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { smartSearch } from '@/shared/utils/smartSearch';
import {
  addToSearchHistory,
  clearSearchHistory,
  getRecentSearches,
  removeFromSearchHistory,
} from '@/shared/utils/searchHistory';

type Filter = 'all' | 'inspo' | 'learn';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'inspo', label: 'Inspiration' },
  { value: 'learn', label: 'Learn' },
] as const;

const INSPO_TOPICS = new Set(['styling', 'tips']);
const SEARCH_FIELDS = ['title', 'description', 'topic', 'hairTypes'];
// Until the backend has a search endpoint, matching happens here — over one page,
// so typing stays instant however big the catalogue gets.
const PAGE_SIZE = 50;

const useStyles = makeStyles(() => ({
  top: { gap: space.md, paddingHorizontal: GUTTER, paddingBottom: space.md },
  idle: { gap: space.xxl, paddingHorizontal: GUTTER, paddingTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

export default function SearchScreen() {
  const styles = useStyles();
  const router = useRouter();
  const insets = useContentInsets();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [recents, setRecents] = useState<string[]>([]);
  const term = useDebouncedValue(query.trim(), 200);
  const { data } = useContent({ limit: PAGE_SIZE });

  useEffect(() => {
    getRecentSearches().then(items => setRecents(items.map(i => i.query)));
  }, []);

  const pool = (data?.data ?? []).filter(item =>
    filter === 'all' ? true : INSPO_TOPICS.has(item.topic) === (filter === 'inspo')
  );
  const results = term ? smartSearch<Content>(term, pool, SEARCH_FIELDS, 50).map(r => r.item) : [];

  const remember = (text: string) => {
    if (!text) return;
    addToSearchHistory(text);
    setRecents(prev => [text, ...prev.filter(q => q !== text)].slice(0, 10));
  };
  const forget = (text: string) => {
    removeFromSearchHistory(text);
    setRecents(prev => prev.filter(q => q !== text));
  };
  const open = (content: Content) => {
    remember(term);
    router.push(`/content/${content.id}`);
  };

  return (
    <Screen back scroll={false} padded={false} contentStyle={{ paddingBottom: 0 }}>
      <View style={styles.top}>
        <SearchField
          placeholder="Search styles, tips and care"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => remember(query.trim())}
          autoFocus
        />
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {term ? (
        <FlashList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ContentRow content={item} onPress={open} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom }}
          ListEmptyComponent={
            <EmptyState
              icon={SearchX}
              title={`Nothing for “${term}”`}
              message="Try a different word, or search all content."
            />
          }
        />
      ) : (
        <View style={styles.idle}>
          {recents.length > 0 && (
            <View>
              <SectionHeader
                title="Recent"
                actionLabel="Clear"
                onAction={() => {
                  clearSearchHistory();
                  setRecents([]);
                }}
              />
              <Section>
                {recents.slice(0, 5).map(text => (
                  <ListRow
                    key={text}
                    title={text}
                    icon={Clock}
                    onPress={() => setQuery(text)}
                    trailing={
                      <IconButton
                        icon={X}
                        variant="plain"
                        size={32}
                        accessibilityLabel={`Remove ${text}`}
                        onPress={() => forget(text)}
                      />
                    }
                  />
                ))}
              </Section>
            </View>
          )}
          <View>
            <SectionHeader title="Browse topics" />
            <View style={styles.chips}>
              {TOPIC_ORDER.map(topic => (
                <Chip key={topic} label={TOPIC_LABELS[topic]} onPress={() => setQuery(topic)} />
              ))}
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}
