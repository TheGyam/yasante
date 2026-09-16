/**
 * Smart search utility with fuzzy matching, related terms, and spell correction
 */

export interface SearchResult<T> {
  item: T;
  score: number;
  matchedFields: string[];
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Related terms mapping for smart search
 * Maps search terms to related concepts
 */
const RELATED_TERMS: Record<string, string[]> = {
  'ice': ['water', 'moisture', 'hydration', 'hydrating'],
  'water': ['moisture', 'hydration', 'hydrating', 'liquid'],
  'moisture': ['hydration', 'hydrating', 'water', 'moisturizing'],
  'dry': ['moisture', 'hydration', 'hydrating', 'moisturizing'],
  'growth': ['length', 'long', 'grow', 'longer'],
  'long': ['growth', 'length', 'grow', 'longer'],
  'short': ['trim', 'cut', 'cutting'],
  'color': ['dye', 'dying', 'coloring', 'tint'],
  'dye': ['color', 'coloring', 'tint'],
  'curl': ['curly', 'curls', 'curling', 'texture'],
  'straight': ['straighten', 'straightening', 'flat'],
  'damage': ['repair', 'repairing', 'treatment', 'healthy'],
  'repair': ['damage', 'treatment', 'healthy', 'restore'],
  'oil': ['oils', 'oily', 'grease', 'greasy'],
  'product': ['products', 'item', 'items'],
  'style': ['styling', 'styled', 'look', 'looks'],
  'tip': ['tips', 'advice', 'trick', 'tricks'],
};

/**
 * Get related terms for a given query
 */
function getRelatedTerms(query: string): string[] {
  const lowerQuery = query.toLowerCase().trim();
  const related: string[] = [];
  
  // Check direct matches
  if (RELATED_TERMS[lowerQuery]) {
    related.push(...RELATED_TERMS[lowerQuery]);
  }
  
  // Check partial matches (e.g., "moisturizing" contains "moisture")
  Object.entries(RELATED_TERMS).forEach(([key, values]) => {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      related.push(...values);
    }
    values.forEach(value => {
      if (lowerQuery.includes(value) || value.includes(lowerQuery)) {
        related.push(key, ...values);
      }
    });
  });
  
  return [...new Set(related)]; // Remove duplicates
}

/**
 * Extract searchable text from an item
 */
function extractSearchableText(item: any, fields: string[]): string {
  return fields
    .map(field => {
      const value = item[field];
      if (Array.isArray(value)) {
        return value.join(' ');
      }
      return value ? String(value).toLowerCase() : '';
    })
    .join(' ')
    .toLowerCase();
}

/**
 * Calculate relevance score for a search result
 */
function calculateRelevanceScore(
  query: string,
  searchableText: string,
  matchedFields: string[]
): number {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  let score = 0;
  
  // Exact match gets highest score
  if (searchableText.includes(lowerQuery)) {
    score += 100;
  }
  
  // Word matches
  words.forEach(word => {
    if (searchableText.includes(word)) {
      score += 50;
    }
  });
  
  // Starts with query gets bonus
  if (searchableText.startsWith(lowerQuery)) {
    score += 30;
  }
  
  // Fuzzy matching score
  const fuzzyScore = similarityScore(lowerQuery, searchableText.substring(0, lowerQuery.length + 10));
  score += fuzzyScore * 20;
  
  // Field priority (title matches are more important)
  if (matchedFields.includes('title')) {
    score += 40;
  }
  if (matchedFields.includes('description')) {
    score += 20;
  }
  
  return score;
}

/**
 * Smart search function
 * @param query - Search query
 * @param items - Array of items to search
 * @param searchFields - Fields to search in
 * @param limit - Maximum number of results to return
 */
export function smartSearch<T extends Record<string, any>>(
  query: string,
  items: T[],
  searchFields: string[] = ['title', 'description'],
  limit: number = 50
): SearchResult<T>[] {
  if (!query.trim() || items.length === 0) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const relatedTerms = getRelatedTerms(lowerQuery);
  const allSearchTerms = [lowerQuery, ...relatedTerms];
  
  const results: SearchResult<T>[] = [];
  const seenItems = new Set<string>();
  
  items.forEach(item => {
    const searchableText = extractSearchableText(item, searchFields);
    const matchedFields: string[] = [];
    
    // Check if any search term matches
    let bestScore = 0;
    let matched = false;
    
    allSearchTerms.forEach(term => {
      // Check each field
      searchFields.forEach(field => {
        const fieldValue = item[field];
        if (!fieldValue) return;
        
        const fieldText = Array.isArray(fieldValue)
          ? fieldValue.join(' ').toLowerCase()
          : String(fieldValue).toLowerCase();
        
        // Exact match
        if (fieldText.includes(term)) {
          matched = true;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
        }
        
        // Fuzzy match (for typos)
        const similarity = similarityScore(term, fieldText);
        if (similarity > 0.6) { // 60% similarity threshold
          matched = true;
          if (!matchedFields.includes(field)) {
            matchedFields.push(field);
          }
        }
      });
    });
    
    if (matched) {
      const score = calculateRelevanceScore(lowerQuery, searchableText, matchedFields);
      bestScore = Math.max(bestScore, score);
      
      // Use item id or index as unique identifier
      const itemId = item.id || JSON.stringify(item);
      if (!seenItems.has(itemId)) {
        seenItems.add(itemId);
        results.push({
          item,
          score: bestScore,
          matchedFields: [...new Set(matchedFields)],
        });
      }
    }
  });
  
  // Sort by score (highest first) and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(
  query: string,
  items: Array<{ title: string; [key: string]: any }>,
  limit: number = 5
): string[] {
  if (!query.trim() || items.length === 0) {
    return [];
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const suggestions = new Set<string>();
  
  items.forEach(item => {
    const title = item.title?.toLowerCase() || '';
    
    // Check if title starts with or contains query
    if (title.startsWith(lowerQuery) || title.includes(lowerQuery)) {
      suggestions.add(item.title);
    }
    
    // Check for word matches
    const words = title.split(/\s+/);
    words.forEach(word => {
      if (word.startsWith(lowerQuery) && word.length > lowerQuery.length) {
        suggestions.add(item.title);
      }
    });
  });
  
  return Array.from(suggestions).slice(0, limit);
}

