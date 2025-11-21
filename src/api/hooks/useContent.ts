import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../client';
import { Content } from '@/types/education';
import { CursorPaginatedResponse } from '@/types/api';

const CONTENT_QUERY_KEY = 'content';
const FAVORITES_QUERY_KEY = 'favorites';

export function useContent(filters?: {
  hairType?: string;
  topic?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: [CONTENT_QUERY_KEY, filters],
    queryFn: async () => {
      const response = await api.content.getAll(filters);
      return response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useInfiniteContent(filters?: {
  hairType?: string;
  topic?: string;
  type?: string;
}) {
  return useInfiniteQuery<CursorPaginatedResponse<Content>>({
    queryKey: [CONTENT_QUERY_KEY, 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      try {
        // Always pass cursor explicitly to ensure cursor-based pagination
        const response = await api.content.getAll({ 
          ...filters, 
          cursor: pageParam as string | undefined, 
          limit: 20 
        });
        
        // CRITICAL: Ensure response has the correct structure
        if (!response || typeof response !== 'object') {
          return {
            data: [], // ALWAYS return an array, never undefined
            pagination: {
              hasMore: false,
              nextCursor: undefined,
              limit: 20,
            },
          } as CursorPaginatedResponse<Content>;
        }
        
        // CRITICAL: Always ensure data is an array, never undefined
        const data = Array.isArray(response.data) ? response.data : [];
        
        // Check if response has cursor-based pagination structure
        if (response.pagination && typeof response.pagination === 'object' && 'hasMore' in response.pagination) {
          // Already cursor-based pagination - ensure data is an array
          return {
            data, // ALWAYS an array
            pagination: {
              ...response.pagination,
              hasMore: Boolean(response.pagination.hasMore),
              nextCursor: response.pagination.nextCursor ?? undefined,
              limit: response.pagination.limit || 20,
            },
          } as CursorPaginatedResponse<Content>;
        }
        
        // Convert offset-based pagination to cursor-based
        // This handles the case where cursor is undefined and API returns offset pagination
        const pagination = response.pagination || {};
        
        // If it's offset-based pagination, we need to determine hasMore
        const hasMore = 'totalPages' in pagination 
          ? (pagination.page || 1) < (pagination.totalPages || 1)
          : false;
        
        const lastItem = data.length > 0 ? data[data.length - 1] : null;
        const nextCursor = hasMore && lastItem && lastItem.publishedAt ? lastItem.publishedAt : undefined;
        
        return {
          data, // ALWAYS an array
          pagination: {
            cursor: pageParam as string | undefined,
            nextCursor,
            hasMore: Boolean(hasMore),
            limit: pagination.limit || 20,
          },
        } as CursorPaginatedResponse<Content>;
      } catch (error) {
        console.error('Error fetching infinite content:', error);
        // CRITICAL: Even in error case, return data as array
        return {
          data: [], // ALWAYS return an array, never undefined
          pagination: {
            hasMore: false,
            nextCursor: undefined,
            limit: 20,
          },
        } as CursorPaginatedResponse<Content>;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      try {
        // CRITICAL: Guard against undefined or null lastPage
        if (!lastPage || typeof lastPage !== 'object') {
          return undefined;
        }
        
        // CRITICAL: Check if 'data' property exists before accessing it
        // React Query may try to access lastPage.data.length internally
        if (!('data' in lastPage)) {
          return undefined;
        }
        
        // CRITICAL: Ensure data is always an array (never undefined)
        if (!Array.isArray(lastPage.data)) {
          return undefined;
        }
        
        // Guard against missing pagination
        if (!lastPage.pagination || typeof lastPage.pagination !== 'object') {
          return undefined;
        }
        
        // Guard against missing hasMore property - must be a boolean
        if (typeof lastPage.pagination.hasMore !== 'boolean') {
          return undefined;
        }
        
        // Return next cursor if there are more pages
        if (lastPage.pagination.hasMore && lastPage.pagination.nextCursor) {
          return lastPage.pagination.nextCursor;
        }
        
        return undefined;
      } catch (error) {
        console.error('Error in getNextPageParam:', error);
        return undefined;
      }
    },
    getPreviousPageParam: () => undefined, // Cursor-based pagination only goes forward
    initialPageParam: undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useContentItem(contentId: string) {
  return useQuery({
    queryKey: [CONTENT_QUERY_KEY, contentId],
    queryFn: async () => {
      const response = await api.content.getById(contentId);
      // Debug: Log the response to verify articleContent is present
      console.log('API Response for content:', {
        id: response.data.id,
        hasArticleContent: !!response.data.articleContent,
        articleContentLength: response.data.articleContent?.length || 0,
      });
      return response.data;
    },
    enabled: !!contentId,
    staleTime: 10 * 60 * 1000, // 10 minutes - cache for instant navigation
    gcTime: 30 * 60 * 1000, // 30 minutes - keep cached data longer
  });
}

export function useSearchContent() {
  return useMutation({
    mutationFn: async (query: string) => {
      const response = await api.content.search(query);
      return response.data;
    },
  });
}

export function useFavorites(userId: string = 'user-1', options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [FAVORITES_QUERY_KEY, userId],
    queryFn: async () => {
      const response = await api.favorites.getAll(userId);
      return response.data;
    },
    enabled: options?.enabled !== false && !!userId,
  });
}

export function useToggleFavorite(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await api.favorites.toggle(userId, contentId);
      return { contentId, ...response.data };
    },
    // Optimistic update
    onMutate: async (contentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [FAVORITES_QUERY_KEY, userId] });
      await queryClient.cancelQueries({ queryKey: [FAVORITES_QUERY_KEY, userId, contentId] });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData([FAVORITES_QUERY_KEY, userId]);
      const previousIsFavorite = queryClient.getQueryData([FAVORITES_QUERY_KEY, userId, contentId]);

      // Optimistically update
      queryClient.setQueryData([FAVORITES_QUERY_KEY, userId, contentId], (old: boolean) => !old);
      
      return { previousFavorites, previousIsFavorite };
    },
    onError: (err, contentId, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData([FAVORITES_QUERY_KEY, userId], context.previousFavorites);
      }
      if (context?.previousIsFavorite !== undefined) {
        queryClient.setQueryData([FAVORITES_QUERY_KEY, userId, contentId], context.previousIsFavorite);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [CONTENT_QUERY_KEY] });
    },
  });
}

// Prefetch utilities
export function prefetchContentItem(queryClient: ReturnType<typeof useQueryClient>, contentId: string) {
  return queryClient.prefetchQuery({
    queryKey: [CONTENT_QUERY_KEY, contentId],
    queryFn: async () => {
      const response = await api.content.getById(contentId);
      return response.data;
    },
  });
}

export async function prefetchRelatedContent(
  queryClient: ReturnType<typeof useQueryClient>,
  contentId: string,
  topic: string
) {
  const queryKey = [CONTENT_QUERY_KEY, 'related', contentId, topic];
  try {
    const response = (await api.content.getAll({
      topic,
      excludeId: contentId,
      cursor: undefined,
      limit: 20,
    })) as CursorPaginatedResponse<Content>;
    
    // Normalize single page into react-query infinite shape
    const page: CursorPaginatedResponse<Content> = {
      data: Array.isArray(response.data) ? response.data : [],
      pagination: response.pagination && typeof response.pagination === 'object'
        ? {
            ...response.pagination,
            hasMore: Boolean(response.pagination.hasMore),
            nextCursor: response.pagination.nextCursor ?? undefined,
            limit: response.pagination.limit || 20,
          }
        : {
            hasMore: false,
            nextCursor: undefined,
            limit: 20,
          },
    };
    
    // Set the cache in the infinite query shape: { pages: [...], pageParams: [...] }
    queryClient.setQueryData(queryKey, {
      pages: [page],
      pageParams: [undefined],
    });
  } catch (err) {
    // If prefetch fails, ensure we don't leave malformed data
    queryClient.setQueryData(queryKey, {
      pages: [],
      pageParams: [],
    });
  }
}

export function useIsFavorite(userId: string = 'user-1', contentId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [FAVORITES_QUERY_KEY, userId, contentId],
    queryFn: async () => {
      const response = await api.favorites.isFavorite(userId, contentId);
      return response.data;
    },
    enabled: (options?.enabled !== false) && !!contentId && !!userId,
  });
}

export function useRelatedContent(contentId: string, topic: string, options?: { enabled?: boolean }) {
  // Ensure topic is not empty string - empty string will disable the query
  const validTopic = topic && topic.trim() ? topic : '';
  const isEnabled = (options?.enabled !== false) && !!contentId && !!validTopic;
  const queryClient = useQueryClient();
  const queryKey = [CONTENT_QUERY_KEY, 'related', contentId, validTopic];
  
  // Clean up any invalid cached data on mount and when query key changes
  useEffect(() => {
    // Always check cached data, even if query is disabled
    const cachedData = queryClient.getQueryData(queryKey) as any;
    if (cachedData) {
      // Check if cached data has invalid structure
      const hasInvalidPages = cachedData.pages && Array.isArray(cachedData.pages) && 
        cachedData.pages.some((page: any) => 
          !page || typeof page !== 'object' || !('data' in page) || !Array.isArray(page.data)
        );
      
      if (hasInvalidPages || !cachedData.pages || !Array.isArray(cachedData.pages)) {
        // Clear invalid cached data immediately
        queryClient.removeQueries({ queryKey });
      }
    }
  }, [queryClient, queryKey]);
  
  return useInfiniteQuery<CursorPaginatedResponse<Content>>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      try {
        // Always pass cursor explicitly to ensure cursor-based pagination
        const response = await api.content.getAll({ 
          topic: validTopic,
          excludeId: contentId,
          cursor: pageParam as string | undefined, 
          limit: 20 
        });
        
        // CRITICAL: Ensure response has the correct structure
        if (!response || typeof response !== 'object') {
          return {
            data: [], // ALWAYS return an array, never undefined
            pagination: {
              hasMore: false,
              nextCursor: undefined,
              limit: 20,
            },
          } as CursorPaginatedResponse<Content>;
        }
        
        // CRITICAL: Always ensure data is an array, never undefined
        const data = Array.isArray(response.data) ? response.data : [];
        
        // Check if response has cursor-based pagination structure
        if (response.pagination && typeof response.pagination === 'object' && 'hasMore' in response.pagination) {
          // Already cursor-based pagination - ensure data is an array
          return {
            data, // ALWAYS an array
            pagination: {
              ...response.pagination,
              hasMore: Boolean(response.pagination.hasMore),
              nextCursor: response.pagination.nextCursor ?? undefined,
              limit: response.pagination.limit || 20,
            },
          } as CursorPaginatedResponse<Content>;
        }
        
        // Convert offset-based pagination to cursor-based
        // This handles the case where cursor is undefined and API returns offset pagination
        const pagination = response.pagination || {};
        
        // If it's offset-based pagination, we need to determine hasMore
        const hasMore = 'totalPages' in pagination 
          ? (pagination.page || 1) < (pagination.totalPages || 1)
          : false;
        
        const lastItem = data.length > 0 ? data[data.length - 1] : null;
        const nextCursor = hasMore && lastItem && lastItem.publishedAt ? lastItem.publishedAt : undefined;
        
        return {
          data, // ALWAYS an array
          pagination: {
            cursor: pageParam as string | undefined,
            nextCursor,
            hasMore: Boolean(hasMore),
            limit: pagination.limit || 20,
          },
        } as CursorPaginatedResponse<Content>;
      } catch (error) {
        console.error('Error fetching related content:', error);
        // CRITICAL: Even in error case, return data as array
        return {
          data: [], // ALWAYS return an array, never undefined
          pagination: {
            hasMore: false,
            nextCursor: undefined,
            limit: 20,
          },
        } as CursorPaginatedResponse<Content>;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      try {
        // CRITICAL: Guard against undefined or null lastPage
        if (!lastPage || typeof lastPage !== 'object') {
          return undefined;
        }
        
        // CRITICAL: Validate allPages array to ensure all pages are valid
        // TanStack Query may iterate through allPages and access page.data.length
        if (allPages && Array.isArray(allPages)) {
          for (const page of allPages) {
            if (!page || typeof page !== 'object' || !('data' in page) || !Array.isArray(page.data)) {
              // If any page is invalid, return undefined to prevent corruption
              return undefined;
            }
          }
        }
        
        // CRITICAL: Check if 'data' property exists before accessing it
        // React Query may try to access lastPage.data.length internally
        if (!('data' in lastPage)) {
          return undefined;
        }
        
        // CRITICAL: Ensure data is always an array (never undefined)
        if (!Array.isArray(lastPage.data)) {
          return undefined;
        }
        
        // Guard against missing pagination
        if (!lastPage.pagination || typeof lastPage.pagination !== 'object') {
          return undefined;
        }
        
        // Guard against missing hasMore property - must be a boolean
        if (typeof lastPage.pagination.hasMore !== 'boolean') {
          return undefined;
        }
        
        // Return next cursor if there are more pages
        if (lastPage.pagination.hasMore && lastPage.pagination.nextCursor) {
          return lastPage.pagination.nextCursor;
        }
        
        return undefined;
      } catch (error) {
        console.error('Error in getNextPageParam:', error);
        return undefined;
      }
    },
    getPreviousPageParam: () => undefined, // Cursor-based pagination only goes forward
    initialPageParam: undefined,
    // Provide safe initialData to prevent crashes when cached data is missing/invalid
    initialData: {
      pages: [],
      pageParams: [],
    },
    enabled: isEnabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Use structuralSharing to ensure data is always normalized
    structuralSharing: (oldData: any, newData: any) => {
      // Normalize newData first to ensure it's always valid
      if (!newData || !newData.pages || !Array.isArray(newData.pages)) {
        return {
          pages: [],
          pageParams: [],
        };
      }
      
      // Normalize newData pages
      const normalizedNewPages = newData.pages.map((page: any) => {
        if (!page || typeof page !== 'object' || !('data' in page) || !Array.isArray(page.data)) {
          return {
            data: [],
            pagination: {
              hasMore: false,
              nextCursor: undefined,
              limit: 20,
            },
          };
        }
        return page;
      });
      
      const normalizedNewData = {
        pages: normalizedNewPages,
        pageParams: newData.pageParams || [],
      };
      
      // If oldData is invalid, always use normalized newData
      if (!oldData || !oldData.pages || !Array.isArray(oldData.pages)) {
        return normalizedNewData;
      }
      
      // Check if oldData has any invalid pages
      const hasInvalidPages = oldData.pages.some((page: any) => 
        !page || typeof page !== 'object' || !('data' in page) || !Array.isArray(page.data)
      );
      
      if (hasInvalidPages) {
        return normalizedNewData;
      }
      
      // Use normalized newData (structural sharing will be handled by TanStack Query)
      return normalizedNewData;
    },
    // Normalize data structure and migrate old cached data
    select: (data) => {
      // Ensure data exists and has pages array
      if (!data || !data.pages || !Array.isArray(data.pages)) {
        return {
          pages: [],
          pageParams: [],
        };
      }
      
      // Normalize each page to ensure it has valid structure
      const normalizedPages = data.pages.map((page) => {
        // If page is invalid or missing data, return empty page
        if (!page || typeof page !== 'object') {
          return {
            data: [],
            pagination: {
              hasMore: false,
              nextCursor: undefined,
              limit: 20,
            },
          } as CursorPaginatedResponse<Content>;
        }
        
        // Ensure data is always an array
        const pageData = Array.isArray(page.data) ? page.data : [];
        
        // Ensure pagination exists and has required properties
        const pagination = page.pagination && typeof page.pagination === 'object'
          ? {
              ...page.pagination,
              hasMore: typeof page.pagination.hasMore === 'boolean' ? page.pagination.hasMore : false,
              nextCursor: page.pagination.nextCursor ?? undefined,
              limit: page.pagination.limit || 20,
            }
          : {
              hasMore: false,
              nextCursor: undefined,
              limit: 20,
            };
        
        return {
          data: pageData,
          pagination,
        } as CursorPaginatedResponse<Content>;
      });
      
      return {
        pages: normalizedPages,
        pageParams: data.pageParams || [],
      };
    },
  });
}

