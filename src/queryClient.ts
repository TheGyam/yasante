import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized cache settings for social media app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // Dynamic staleTime based on query type
      staleTime: (query) => {
        const key = query.queryKey[0];
        if (key === 'content' && query.queryKey[1] === 'infinite') {
          return 30 * 1000; // 30 seconds for feed
        }
        if (key === 'user') {
          return 5 * 60 * 1000; // 5 minutes for user data
        }
        return 2 * 60 * 1000; // 2 minutes default
      },
      gcTime: 30 * 60 * 1000, // 30 minutes (garbage collection time)
      // Don't use refetchOnWindowFocus on React Native - use AppState hook instead
      refetchOnWindowFocus: false,
      // Always refetch feed on mount, use default for others
      refetchOnMount: (query) => {
        if (query.queryKey[0] === 'content' && query.queryKey[1] === 'infinite') {
          return 'always';
        }
        return false;
      },
      // Don't use refetchInterval - use AppState-aware polling hook instead
      refetchInterval: false,
      refetchOnReconnect: true, // Refetch when reconnecting
    },
  },
});
