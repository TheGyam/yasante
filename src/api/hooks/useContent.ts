import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../client';
import { Content } from '@/types/education';

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInfiniteContent(filters?: {
  hairType?: string;
  topic?: string;
  type?: string;
}) {
  return useInfiniteQuery({
    queryKey: [CONTENT_QUERY_KEY, 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.content.getAll({ ...filters, page: pageParam, limit: 20 });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000, // 5 minutes - cache for instant navigation
    gcTime: 10 * 60 * 1000, // 10 minutes - keep cached data longer
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [CONTENT_QUERY_KEY] });
    },
  });
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

