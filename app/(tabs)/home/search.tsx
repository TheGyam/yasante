import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, TouchableOpacity, View, Keyboard, InteractionManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import styled from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useContent } from '@/api/hooks/useContent';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ImageWithPlaceholder } from '@/components/ui/ImageWithPlaceholder';
import { Search, ArrowLeft, Clock, TrendingUp, Play } from 'lucide-react-native';
import { getRecentSearches, addToSearchHistory, removeFromSearchHistory, clearSearchHistory } from '@/utils/searchHistory';
import { smartSearch, getSearchSuggestions, SearchResult } from '@/utils/smartSearch';
import { Content } from '@/types/education';
import { AuthPromptModal } from '@/components/auth/AuthPromptModal';
import type { Theme } from '@/theme/ThemeProvider';

const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const SearchHeader = styled.View<{ topInset: number }>`
  padding-top: ${({ topInset }) => topInset}px;
  padding-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: Theme }) => theme.colors.borderLight};
`;

const SearchBarContainer = styled.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const BackButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: transparent;
  align-items: center;
  justify-content: center;
`;

const SearchInputContainer = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
`;

const InlineSearchInput = styled.TextInput`
  flex: 1;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.high};
  font-size: ${({ theme }: { theme: Theme }) => theme.fontSizes[2]}px;
  padding: 0;
  margin: 0;
`;

const ClearSearchButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  margin-left: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const FilterButtonsContainer = styled.ScrollView.attrs({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
})``;

const FilterButton = styled(TouchableOpacity)<{ active: boolean }>`
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.round}px;
  background-color: ${({ theme, active }: { theme: Theme; active: boolean }) =>
    active ? theme.colors.primary : theme.colors.surface};
`;

const FilterButtonText = styled(Text)<{ active: boolean }>`
  color: ${({ theme, active }: { theme: Theme; active: boolean }) =>
    active ? '#ffffff' : theme.colors.text.medium};
  font-weight: ${({ active }) => (active ? '600' : '500')};
`;

const ContentScroll = styled.ScrollView`
  flex: 1;
`;

const Section = styled.View`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[5]}px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const SectionTitle = styled(Text)`
  font-size: 20px;
  font-weight: 600;
`;

const ClearButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const RecentSearchesContainer = styled.View`
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const RecentSearchItem = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const RecentSearchIcon = styled.View`
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const RecentSearchText = styled(Text)`
  flex: 1;
`;

const RemoveButton = styled(TouchableOpacity)`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
`;

const SuggestionsContainer = styled.View`
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
`;

const SuggestionItem = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.medium}px;
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const SuggestionIcon = styled.View`
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
`;

const ResultsListContainer = styled.View`
  flex: 1;
`;

const SearchResultItem = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  padding-vertical: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  padding-horizontal: ${({ theme }: { theme: Theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.background};
`;

const ThumbnailContainer = styled.View`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }: { theme: Theme }) => theme.radii.small}px;
  overflow: hidden;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }: { theme: Theme }) => theme.colors.surface};
  position: relative;
`;

const ThumbnailImage = styled(ImageWithPlaceholder)`
  width: 100%;
  height: 100%;
`;

const VideoBadge = styled.View`
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
`;

const ResultContent = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const ResultTextContainer = styled.View`
  flex: 1;
  margin-right: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

const ResultTitle = styled(Text)`
  margin-bottom: ${({ theme }: { theme: Theme }) => theme.spacing[0.5]}px;
  font-weight: 500;
`;

const ResultSubtitle = styled(Text)`
  font-size: ${({ theme }: { theme: Theme }) => theme.fontSizes[1]}px;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.medium};
`;

const CategoryBadge = styled.View`
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[1]}px;
  align-self: flex-start;
`;

const EmptyState = styled.View`
  padding: ${({ theme }: { theme: Theme }) => theme.spacing[6]}px;
  align-items: center;
`;

const EmptyStateText = styled(Text)`
  text-align: center;
  color: ${({ theme }: { theme: Theme }) => theme.colors.text.medium};
  margin-top: ${({ theme }: { theme: Theme }) => theme.spacing[2]}px;
`;

type FilterType = 'all' | 'inspo' | 'education';

interface UnifiedSearchResult {
  id: string;
  title: string;
  subtitle: string;
  thumbnailUri?: string;
  category: 'inspo' | 'education' | 'diy';
  type: 'content';
  contentType?: 'article' | 'video';
  relevanceScore: number;
  originalItem: Content;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: contentData } = useContent();
  const params = useLocalSearchParams<{ query?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [recentSearches, setRecentSearches] = useState<Array<{ query: string; timestamp: number }>>([]);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Restore search query from URL params if present (only on mount or when params change)
  useEffect(() => {
    if (params.query && params.query !== searchQuery) {
      setSearchQuery(params.query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.query]);

  // Load recent searches on mount only
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Reload recent searches when search query is cleared (non-blocking)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Use InteractionManager to load after navigation/interactions complete
      InteractionManager.runAfterInteractions(() => {
        loadRecentSearches();
      });
    }
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    const searches = await getRecentSearches();
    setRecentSearches(searches);
  };

  // Get all content
  const allContent = useMemo(() => contentData?.data || [], [contentData]);

  // Get suggestions based on current input
  const suggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const contentSuggestions = getSearchSuggestions(debouncedQuery, allContent, 5);
    return contentSuggestions;
  }, [debouncedQuery, allContent]);

  // Perform smart search and get results with scores
  const searchResultsWithScores = useMemo(() => {
    if (!debouncedQuery.trim()) return null;

    // Search content
    const contentResults = smartSearch<Content>(
      debouncedQuery,
      allContent,
      ['title', 'description', 'topic', 'hairTypes'],
      50
    );

    return {
      content: contentResults,
      diy: [], // DIYs not yet implemented in backend
    };
  }, [debouncedQuery, allContent]);

  // Merge and sort all results by relevance
  const mergedResults = useMemo((): UnifiedSearchResult[] => {
    if (!searchResultsWithScores) return [];

    const results: UnifiedSearchResult[] = [];

    // Add content results
    searchResultsWithScores.content.forEach((result: SearchResult<Content>) => {
      const item = result.item;
      const category: 'inspo' | 'education' = 
        item.topic === 'styling' || item.topic === 'tips' ? 'inspo' : 'education';
      
      results.push({
        id: item.id,
        title: item.title,
        subtitle: item.type === 'video' ? 'Video' : 'Article',
        thumbnailUri: item.thumbnailUri,
        category,
        type: 'content',
        contentType: item.type,
        relevanceScore: result.score,
        originalItem: item,
      });
    });

    // DIYs not yet implemented in backend - removed

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [searchResultsWithScores]);

  // Filter results based on active filter
  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') {
      return mergedResults;
    }
    return mergedResults.filter(result => result.category === activeFilter);
  }, [mergedResults, activeFilter]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    Keyboard.dismiss();
    
    // Non-blocking: Save to history and reload in background
    InteractionManager.runAfterInteractions(() => {
      addToSearchHistory(query).then(() => {
        loadRecentSearches();
      });
    });
  }, []);

  const handleSuggestionPress = useCallback(async (suggestion: string) => {
    await handleSearch(suggestion);
  }, [handleSearch]);

  const handleRecentSearchPress = useCallback(async (query: string) => {
    await handleSearch(query);
  }, [handleSearch]);

  const handleRemoveRecent = useCallback((query: string, e: any) => {
    e.stopPropagation();
    // Non-blocking: Remove from history in background
    InteractionManager.runAfterInteractions(() => {
      removeFromSearchHistory(query).then(() => {
        loadRecentSearches();
      });
    });
  }, []);

  const handleClearRecent = useCallback(() => {
    // Non-blocking: Clear history in background
    InteractionManager.runAfterInteractions(() => {
      clearSearchHistory().then(() => {
        loadRecentSearches();
      });
    });
  }, []);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
  }, []);

  const handleResultPress = useCallback((result: UnifiedSearchResult) => {
    // Pass returnTo and query parameters to preserve search state
    const queryParam = searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : '';
    if (result.category === 'inspo') {
      router.push(`/(tabs)/home/${result.id}?returnTo=search${queryParam}` as any);
    } else {
      router.push(`/(tabs)/education/${result.id}?returnTo=search${queryParam}` as any);
    }
  }, [router, searchQuery]);

  const renderRecentSearches = () => {
    if (recentSearches.length === 0) return null;

    return (
      <Section>
        <SectionHeader>
          <SectionTitle variant="h3" weight="semibold">
            Recent Searches
          </SectionTitle>
          <ClearButton onPress={handleClearRecent} activeOpacity={0.7}>
            <Text variant="caption" color={theme.colors.primary}>
              Clear
            </Text>
          </ClearButton>
        </SectionHeader>
        <RecentSearchesContainer>
          {recentSearches.map((item) => (
            <RecentSearchItem
              key={`${item.query}-${item.timestamp}`}
              onPress={() => handleRecentSearchPress(item.query)}
              activeOpacity={0.7}
            >
              <RecentSearchIcon>
                <Clock size={18} color={theme.colors.text.medium} />
              </RecentSearchIcon>
              <RecentSearchText variant="body" color={theme.colors.text.high}>
                {item.query}
              </RecentSearchText>
              <RemoveButton
                onPress={(e) => handleRemoveRecent(item.query, e)}
                activeOpacity={0.7}
              >
                <Text variant="caption" color={theme.colors.text.low}>✕</Text>
              </RemoveButton>
            </RecentSearchItem>
          ))}
        </RecentSearchesContainer>
      </Section>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0 || searchQuery.trim() === '') return null;

    return (
      <Section>
        <SectionHeader>
          <SectionTitle variant="h3" weight="semibold">
            Suggestions
          </SectionTitle>
        </SectionHeader>
        <SuggestionsContainer>
          {suggestions.map((suggestion, index) => (
            <SuggestionItem
              key={index}
              onPress={() => handleSuggestionPress(suggestion)}
              activeOpacity={0.7}
            >
              <SuggestionIcon>
                <TrendingUp size={18} color={theme.colors.text.medium} />
              </SuggestionIcon>
              <Text variant="body" color={theme.colors.text.high}>
                {suggestion}
              </Text>
            </SuggestionItem>
          ))}
        </SuggestionsContainer>
      </Section>
    );
  };

  const renderSearchResult = useCallback(({ item }: { item: UnifiedSearchResult }) => {
    const categoryColors = {
      inspo: theme.colors.primary,
      education: theme.colors.info,
    };

    const categoryLabels = {
      inspo: 'Inspo',
      education: 'Education',
    };

    return (
      <SearchResultItem onPress={() => handleResultPress(item)} activeOpacity={0.7}>
        <ThumbnailContainer>
          {item.thumbnailUri ? (
            <>
              <ThumbnailImage
                source={{ uri: item.thumbnailUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              {item.type === 'content' && item.contentType === 'video' && (
                <VideoBadge>
                  <Play size={12} color="#fff" fill="#fff" />
                </VideoBadge>
              )}
            </>
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: theme.colors.surface }} />
          )}
        </ThumbnailContainer>
        <ResultContent>
          <ResultTextContainer>
            <ResultTitle variant="body" weight="semibold" numberOfLines={1}>
              {item.title}
            </ResultTitle>
            <ResultSubtitle numberOfLines={1}>
              {item.subtitle}
            </ResultSubtitle>
            <CategoryBadge
              style={{
                backgroundColor: categoryColors[item.category] + '20',
                borderColor: categoryColors[item.category],
                borderWidth: 1,
                borderRadius: theme.radii.round,
                paddingHorizontal: theme.spacing[2],
                paddingVertical: theme.spacing[0.5],
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: categoryColors[item.category],
                  fontSize: 10,
                  fontWeight: '600',
                }}
              >
                {categoryLabels[item.category]}
              </Text>
            </CategoryBadge>
          </ResultTextContainer>
        </ResultContent>
      </SearchResultItem>
    );
  }, [theme, handleResultPress]);

  const renderResults = () => {
    if (filteredResults.length === 0 && debouncedQuery.trim()) {
      return (
        <EmptyState>
          <Text variant="h3" weight="semibold" color={theme.colors.text.high}>
            No results found
          </Text>
          <EmptyStateText variant="body">
            Try different keywords or check your spelling
          </EmptyStateText>
        </EmptyState>
      );
    }

    if (filteredResults.length === 0) return null;

    return (
      <ResultsListContainer>
        <FlashList
          data={filteredResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          estimatedItemSize={80}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
        />
      </ResultsListContainer>
    );
  };

  return (
    <Container>
      <SearchHeader topInset={insets.top}>
        <SearchBarContainer>
          <BackButton onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={theme.colors.text.high} strokeWidth={2.5} />
          </BackButton>
          <SearchInputContainer>
            <InlineSearchInput
              placeholder="What are you looking for?"
              placeholderTextColor={theme.colors.text.low}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch(searchQuery)}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <ClearSearchButton onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Text variant="caption" color={theme.colors.text.low} style={{ fontSize: 18 }}>
                  ✕
                </Text>
              </ClearSearchButton>
            )}
          </SearchInputContainer>
        </SearchBarContainer>
        <FilterButtonsContainer>
          <FilterButton
            active={activeFilter === 'all'}
            onPress={() => handleFilterChange('all')}
            activeOpacity={0.7}
          >
            <FilterButtonText active={activeFilter === 'all'}>All</FilterButtonText>
          </FilterButton>
          <FilterButton
            active={activeFilter === 'inspo'}
            onPress={() => handleFilterChange('inspo')}
            activeOpacity={0.7}
          >
            <FilterButtonText active={activeFilter === 'inspo'}>Inspo</FilterButtonText>
          </FilterButton>
          <FilterButton
            active={activeFilter === 'education'}
            onPress={() => handleFilterChange('education')}
            activeOpacity={0.7}
          >
            <FilterButtonText active={activeFilter === 'education'}>Education</FilterButtonText>
          </FilterButton>
        </FilterButtonsContainer>
      </SearchHeader>

      {!searchQuery.trim() ? (
        <ContentScroll
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
        >
          {renderRecentSearches()}
          {renderSuggestions()}
        </ContentScroll>
      ) : (
        renderResults()
      )}

      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        feature="favorites"
      />
    </Container>
  );
}
