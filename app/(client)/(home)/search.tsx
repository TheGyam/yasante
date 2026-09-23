import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { openWithHero, useLooks, type Look } from '@/features/looks';
import { useStylistSearch, type StylistSearchResult } from '@/features/stylist';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { GUTTER, makeStyles, radius, space } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { PressableScale } from '@/shared/ui/PressableScale';
import { RemoteImage } from '@/shared/ui/RemoteImage';
import { Text } from '@/shared/ui/Text';
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
import { track } from '@/shared/lib/analytics';

type Filter = 'all' | 'looks' | 'stylists' | 'learn';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'looks', label: 'Looks' },
  { value: 'stylists', label: 'Stylists' },
  { value: 'learn', label: 'Learn' },
] as const;

/** On "All", a taste of each; the tab has the rest. */
const PREVIEW = { looks: 9, stylists: 4, learn: 4 };
const SEARCH_FIELDS = ['title', 'description', 'topic', 'hairTypes'];
// Until the backend has a search endpoint, matching happens here — over one page,
// so typing stays instant however big the catalogue gets.
const PAGE_SIZE = 50;

const useStyles = makeStyles(() => ({
  top: { gap: space.md, paddingHorizontal: GUTTER, paddingBottom: space.md },
  idle: { gap: space.xxl, paddingHorizontal: GUTTER, paddingTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  results: { gap: space.xxl, paddingHorizontal: GUTTER, paddingTop: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  thumbCell: { width: '32.5%' },
  thumb: {
    aspectRatio: 0.8,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  gridCell: { flex: 1, padding: space.xxs },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  personText: { flex: 1, gap: 2 },
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
  const wants = (tab: Filter) => filter === 'all' || filter === tab;
  const looksSearch = useLooks({ q: term }, { enabled: !!term && wants('looks') });
  const people = useStylistSearch(term, { enabled: wants('stylists') });
  const looks = useMemo(
    () => (term ? (looksSearch.data?.pages.flatMap(page => page.data) ?? []) : []),
    [looksSearch.data, term]
  );
  const stylists = term ? (people.data ?? []) : [];

  useEffect(() => {
    getRecentSearches().then(items => setRecents(items.map(i => i.query)));
  }, []);

  const results =
    term && wants('learn')
      ? smartSearch<Content>(term, data?.data ?? [], SEARCH_FIELDS, 50).map(r => r.item)
      : [];
  const nothing = !looks.length && !stylists.length && !results.length;
  const loading = looksSearch.isLoading || people.isLoading;

  useEffect(() => {
    if (term) track('search', { surface: 'all', query: term, filter });
    // When the settled query or filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, filter]);

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
  const openLook = (look: Look) => {
    remember(term);
    router.push(`/looks/${look.id}`);
  };
  const openStylist = (stylist: StylistSearchResult) => {
    remember(term);
    router.push(`/stylist/${stylist.handle}`);
  };
  const empty = (
    <EmptyState
      icon={SearchX}
      title={`Nothing for “${term}”`}
      message="Try a style, a stylist’s name or an area."
    />
  );

  return (
    <Screen back scroll={false} padded={false} contentStyle={{ paddingBottom: 0 }}>
      <View style={styles.top}>
        <SearchField
          placeholder="Search looks, stylists and tips"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => remember(query.trim())}
          autoFocus
        />
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {term && filter === 'looks' ? (
        <FlashList
          data={looks}
          numColumns={3}
          keyExtractor={look => look.id}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <LookThumb look={item} onOpen={openLook} />
            </View>
          )}
          onEndReached={() => {
            if (looksSearch.hasNextPage && !looksSearch.isFetchingNextPage) {
              looksSearch.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom }}
          ListEmptyComponent={looksSearch.isLoading ? null : empty}
        />
      ) : term && filter === 'stylists' ? (
        <FlashList
          data={stylists}
          keyExtractor={stylist => stylist.accountId}
          renderItem={({ item }) => <StylistRow stylist={item} onOpen={openStylist} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom }}
          ListEmptyComponent={people.isLoading ? null : empty}
        />
      ) : term && filter === 'learn' ? (
        <FlashList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ContentRow content={item} onPress={open} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom }}
          ListEmptyComponent={empty}
        />
      ) : term ? (
        // "All": a few of each, strongest signal first.
        <ScrollView
          contentContainerStyle={[styles.results, { paddingBottom: insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {stylists.length > 0 && (
            <View>
              <SectionHeader
                title="Stylists"
                actionLabel={stylists.length > PREVIEW.stylists ? 'See all' : undefined}
                onAction={() => setFilter('stylists')}
              />
              {stylists.slice(0, PREVIEW.stylists).map(stylist => (
                <StylistRow key={stylist.accountId} stylist={stylist} onOpen={openStylist} />
              ))}
            </View>
          )}
          {looks.length > 0 && (
            <View>
              <SectionHeader
                title="Looks"
                actionLabel={looks.length > PREVIEW.looks ? 'See all' : undefined}
                onAction={() => setFilter('looks')}
              />
              <View style={styles.grid}>
                {looks.slice(0, PREVIEW.looks).map(look => (
                  <View key={look.id} style={styles.thumbCell}>
                    <LookThumb look={look} onOpen={openLook} />
                  </View>
                ))}
              </View>
            </View>
          )}
          {results.length > 0 && (
            <View>
              <SectionHeader
                title="Learn"
                actionLabel={results.length > PREVIEW.learn ? 'See all' : undefined}
                onAction={() => setFilter('learn')}
              />
              {results.slice(0, PREVIEW.learn).map(item => (
                <ContentRow key={item.id} content={item} onPress={open} />
              ))}
            </View>
          )}
          {nothing && !loading && empty}
        </ScrollView>
      ) : (
        // Recents plus every topic can outgrow a small screen, and the tab bar
        // floats over the last of them.
        <ScrollView
          contentContainerStyle={[styles.idle, { paddingBottom: insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
      )}
    </Screen>
  );
}

/** A look in search results: tap to open it, growing out of this tile. */
const LookThumb = memo(function LookThumb({
  look,
  onOpen,
}: {
  look: Look;
  onOpen: (look: Look) => void;
}) {
  const styles = useStyles();
  const photo = useRef<View>(null);
  return (
    <PressableScale
      accessibilityLabel={look.caption ?? look.serviceName ?? `A look by ${look.authorName}`}
      onPress={() =>
        openWithHero(photo.current, { lookId: look.id, uri: look.thumbUri ?? look.photoUri }, () =>
          onOpen(look)
        )
      }
    >
      <View ref={photo} style={styles.thumb}>
        <RemoteImage
          uri={look.thumbUri ?? look.photoUri}
          style={StyleSheet.absoluteFill}
          recyclingKey={look.id}
        />
      </View>
    </PressableScale>
  );
});

function StylistRow({
  stylist,
  onOpen,
}: {
  stylist: StylistSearchResult;
  onOpen: (stylist: StylistSearchResult) => void;
}) {
  const styles = useStyles();
  return (
    <PressableScale
      accessibilityLabel={`${stylist.displayName}, ${stylist.baseArea}. Open her page`}
      onPress={() => onOpen(stylist)}
      style={styles.person}
    >
      <Avatar uri={stylist.avatarUri} name={stylist.displayName} size={44} />
      <View style={styles.personText}>
        <Text variant="callout" numberOfLines={1}>
          {stylist.displayName}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={1}>
          @{stylist.handle} · {stylist.baseArea}
        </Text>
      </View>
    </PressableScale>
  );
}
