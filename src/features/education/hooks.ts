import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { api } from '@/api';
import { Content, Favorite } from '@/features/education';
import { CursorPaginatedResponse } from '@/shared/types/api';
import { useAuth } from '@/features/auth';

const CONTENT_QUERY_KEY = 'content';
const FAVORITES_QUERY_KEY = 'favorites';

export function useContent(filters?: {
  hairType?: string;
  topic?: string;
  type?: string;
  /** Always pass one: a screen should read a page, never the whole catalogue. */
  limit?: number;
}) {
  return useQuery({
    queryKey: [CONTENT_QUERY_KEY, filters],
    queryFn: async () => {
      const response = await api.content.getAll(filters);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for filtered lists
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useInfiniteContent(filters?: { hairType?: string; topic?: string; type?: string }) {
  return useInfiniteQuery<CursorPaginatedResponse<Content>>({
    queryKey: [CONTENT_QUERY_KEY, 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      try {
        // Always pass cursor explicitly to ensure cursor-based pagination
        const response = await api.content.getAll({
          ...filters,
          cursor: pageParam as string | undefined,
          limit: 20,
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
        if (
          response.pagination &&
          typeof response.pagination === 'object' &&
          'hasMore' in response.pagination
        ) {
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
        const hasMore =
          'totalPages' in pagination
            ? (pagination.page || 1) < (pagination.totalPages || 1)
            : false;

        const lastItem = data.length > 0 ? data[data.length - 1] : null;
        const nextCursor =
          hasMore && lastItem && lastItem.publishedAt ? lastItem.publishedAt : undefined;

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
    staleTime: 30 * 1000, // 30 seconds for feed (optimized for social media)
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useContentItem(contentId: string) {
  return useQuery({
    queryKey: [CONTENT_QUERY_KEY, contentId],
    queryFn: async () => {
      const response = await api.content.getById(contentId);
      return response.data;
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5 minutes for detail pages
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

export function useFavorites(userId?: string, options?: { enabled?: boolean }) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [FAVORITES_QUERY_KEY, actualUserId],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.favorites.getAll(actualUserId);
      return response.data;
    },
    enabled: options?.enabled !== false && !!actualUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes - keep favorites fresh longer
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useToggleFavorite(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (contentId: string) => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      // Generate client UUID for idempotency
      const clientMutationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const response = await api.favorites.toggle(actualUserId, contentId);
      // Server returns canonical state - use it
      return { contentId, ...response.data, clientMutationId };
    },
    // Optimistic update
    onMutate: async contentId => {
      if (!actualUserId) return;
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [FAVORITES_QUERY_KEY, actualUserId] });
      await queryClient.cancelQueries({ queryKey: [FAVORITES_QUERY_KEY, actualUserId, contentId] });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>([
        FAVORITES_QUERY_KEY,
        actualUserId,
      ]);
      const previousIsFavorite = queryClient.getQueryData<boolean>([
        FAVORITES_QUERY_KEY,
        actualUserId,
        contentId,
      ]);

      // Optimistically update isFavorite cache
      const newIsFavorite = !previousIsFavorite;
      queryClient.setQueryData([FAVORITES_QUERY_KEY, actualUserId, contentId], newIsFavorite);

      // Optimistically update favorites list
      queryClient.setQueryData<Favorite[]>([FAVORITES_QUERY_KEY, actualUserId], (old = []) => {
        if (newIsFavorite) {
          // Add favorite if it doesn't exist
          if (!old.find(f => f.contentId === contentId)) {
            return [
              ...old,
              {
                id: `temp-${contentId}`, // Temporary ID until we get real response
                userId: actualUserId,
                contentId,
                createdAt: new Date().toISOString(),
              },
            ];
          }
          return old;
        } else {
          // Remove favorite
          return old.filter(f => f.contentId !== contentId);
        }
      });

      return { previousFavorites, previousIsFavorite };
    },
    onSuccess: (data, contentId) => {
      if (!actualUserId) return;

      // Update isFavorite cache with server-confirmed state
      queryClient.setQueryData([FAVORITES_QUERY_KEY, actualUserId, contentId], data.isFavorite);

      // Update favorites list cache with server-confirmed state
      queryClient.setQueryData<Favorite[]>([FAVORITES_QUERY_KEY, actualUserId], (old = []) => {
        if (data.isFavorite) {
          // Add favorite if it doesn't exist, or replace temp one
          const existingIndex = old.findIndex(f => f.contentId === contentId);
          if (data.favorite) {
            if (existingIndex >= 0) {
              // Replace temp favorite with real one
              const updated = [...old];
              updated[existingIndex] = data.favorite;
              return updated;
            } else {
              // Add new favorite
              return [...old, data.favorite];
            }
          }
          return old;
        } else {
          // Remove favorite
          return old.filter(f => f.contentId !== contentId);
        }
      });
    },
    onError: (err, contentId, context) => {
      if (!actualUserId) return;
      // Rollback on error
      if (context?.previousFavorites !== undefined) {
        queryClient.setQueryData([FAVORITES_QUERY_KEY, actualUserId], context.previousFavorites);
      }
      if (context?.previousIsFavorite !== undefined) {
        queryClient.setQueryData(
          [FAVORITES_QUERY_KEY, actualUserId, contentId],
          context.previousIsFavorite
        );
      }
    },
  });
}

// Prefetch utilities
export function prefetchContentItem(
  queryClient: ReturnType<typeof useQueryClient>,
  contentId: string
) {
  return queryClient.prefetchQuery({
    queryKey: [CONTENT_QUERY_KEY, contentId],
    queryFn: async () => {
      const response = await api.content.getById(contentId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for prefetched content
  });
}

export function prefetchNextPage(
  queryClient: ReturnType<typeof useQueryClient>,
  filters?: {
    hairType?: string;
    topic?: string;
    type?: string;
  }
) {
  // Prefetch next page of infinite content
  const queryKey = [CONTENT_QUERY_KEY, 'infinite', filters];
  const queryData = queryClient.getQueryData(queryKey) as any;

  if (queryData?.pages && queryData.pages.length > 0) {
    const lastPage = queryData.pages[queryData.pages.length - 1];
    const nextCursor = lastPage?.pagination?.nextCursor;

    if (nextCursor) {
      return queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam }) => {
          const response = await api.content.getAll({
            ...filters,
            cursor: pageParam as string | undefined,
            limit: 20,
          });
          return response;
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage: any) => {
          if (lastPage?.pagination?.hasMore && lastPage?.pagination?.nextCursor) {
            return lastPage.pagination.nextCursor;
          }
          return undefined;
        },
      });
    }
  }

  return Promise.resolve();
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
      pagination:
        response.pagination && typeof response.pagination === 'object'
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

export function useIsFavorite(
  userId: string | undefined,
  contentId: string,
  options?: { enabled?: boolean }
) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;
  const queryClient = useQueryClient();

  // Get initial data from cache (for use in initialData)
  // This writes to global cache, making it available to all observers
  const getInitialData = (): boolean | undefined => {
    if (!actualUserId || !contentId) return undefined;

    // Check if we have the specific favorite cache entry
    const cachedValue = queryClient.getQueryData<boolean>([
      FAVORITES_QUERY_KEY,
      actualUserId,
      contentId,
    ]);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Fallback: check favorites list and derive value
    const favoritesList = queryClient.getQueryData<Favorite[]>([FAVORITES_QUERY_KEY, actualUserId]);
    if (favoritesList && Array.isArray(favoritesList)) {
      return favoritesList.some(f => f.contentId === contentId);
    }

    return undefined;
  };

  const query = useQuery({
    queryKey: [FAVORITES_QUERY_KEY, actualUserId, contentId],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }

      const response = await api.favorites.isFavorite(actualUserId, contentId);
      const isFavorite = response.data;
      // Update cache with API response
      queryClient.setQueryData([FAVORITES_QUERY_KEY, actualUserId, contentId], isFavorite);
      return isFavorite;
    },
    enabled: options?.enabled !== false && !!contentId && !!actualUserId,
    // Use initialData to write to global cache (not just observer-local)
    // This ensures the cached value is available to all observers
    initialData: getInitialData,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return query;
}

export function useRelatedContent(
  contentId: string,
  topic: string,
  options?: { enabled?: boolean }
) {
  // Ensure topic is not empty string - empty string will disable the query
  const validTopic = topic && topic.trim() ? topic : '';
  const isEnabled = options?.enabled !== false && !!contentId && !!validTopic;
  const queryClient = useQueryClient();
  const queryKey = [CONTENT_QUERY_KEY, 'related', contentId, validTopic];

  // Clean up any invalid cached data on mount and when query key changes
  useEffect(() => {
    // Always check cached data, even if query is disabled
    const cachedData = queryClient.getQueryData(queryKey) as any;
    if (cachedData) {
      // Check if cached data has invalid structure
      const hasInvalidPages =
        cachedData.pages &&
        Array.isArray(cachedData.pages) &&
        cachedData.pages.some(
          (page: any) =>
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
          limit: 20,
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
        if (
          response.pagination &&
          typeof response.pagination === 'object' &&
          'hasMore' in response.pagination
        ) {
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
        const hasMore =
          'totalPages' in pagination
            ? (pagination.page || 1) < (pagination.totalPages || 1)
            : false;

        const lastItem = data.length > 0 ? data[data.length - 1] : null;
        const nextCursor =
          hasMore && lastItem && lastItem.publishedAt ? lastItem.publishedAt : undefined;

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
            if (
              !page ||
              typeof page !== 'object' ||
              !('data' in page) ||
              !Array.isArray(page.data)
            ) {
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
      const hasInvalidPages = oldData.pages.some(
        (page: any) =>
          !page || typeof page !== 'object' || !('data' in page) || !Array.isArray(page.data)
      );

      if (hasInvalidPages) {
        return normalizedNewData;
      }

      // Use normalized newData (structural sharing will be handled by TanStack Query)
      return normalizedNewData;
    },
    // Normalize data structure and migrate old cached data
    select: data => {
      // Ensure data exists and has pages array
      if (!data || !data.pages || !Array.isArray(data.pages)) {
        return {
          pages: [],
          pageParams: [],
        };
      }

      // Normalize each page to ensure it has valid structure
      const normalizedPages = data.pages.map(page => {
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
        const pagination =
          page.pagination && typeof page.pagination === 'object'
            ? {
                ...page.pagination,
                hasMore:
                  typeof page.pagination.hasMore === 'boolean' ? page.pagination.hasMore : false,
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
