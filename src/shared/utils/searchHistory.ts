import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@yasante:searchHistory';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

/**
 * Get all recent searches from storage
 */
export async function getRecentSearches(): Promise<SearchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const history: SearchHistoryItem[] = JSON.parse(data);
    // Sort by timestamp (most recent first) and limit to MAX_HISTORY_ITEMS
    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS);
  } catch (error) {
    console.warn('Failed to get search history:', error);
    return [];
  }
}

/**
 * Add a search query to history
 */
export async function addToSearchHistory(query: string): Promise<void> {
  try {
    if (!query.trim()) return;

    const history = await getRecentSearches();

    // Remove duplicate if exists (will be re-added at the top)
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());

    // Add new search at the beginning
    const updated: SearchHistoryItem[] = [
      { query: query.trim(), timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save search history:', error);
  }
}

/**
 * Remove a specific search from history
 */
export async function removeFromSearchHistory(query: string): Promise<void> {
  try {
    const history = await getRecentSearches();
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('Failed to remove search from history:', error);
  }
}

/**
 * Clear all search history
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear search history:', error);
  }
}

/**
 * Get search suggestions based on recent searches matching input
 */
export async function getSearchSuggestions(input: string): Promise<string[]> {
  try {
    if (!input.trim()) return [];

    const history = await getRecentSearches();
    const lowerInput = input.toLowerCase();

    // Filter history items that start with or contain the input
    const matches = history
      .filter(item => item.query.toLowerCase().includes(lowerInput))
      .map(item => item.query)
      .slice(0, 5); // Limit to 5 suggestions

    return matches;
  } catch (error) {
    console.warn('Failed to get search suggestions:', error);
    return [];
  }
}
