import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';

/**
 * Hook to ensure UI waits for cache restore before rendering favorites/heart state
 * Prefetches critical queries after restore
 */
export function useCacheRestored() {
  const [isRestored, setIsRestored] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    // Check if cache is restored by waiting for React Query persistence to hydrate
    const checkRestored = async () => {
      // Wait a bit for React Query persistence to restore
      // This is a workaround - React Query doesn't expose a direct "restored" event
      await new Promise(resolve => setTimeout(resolve, 100));

      // Prefetch critical queries after restore to ensure heart state is correct
      if (user?.id) {
        try {
          // Prefetch favorites to ensure heart state is correct
          await queryClient.prefetchQuery({
            queryKey: ['favorites', user.id],
            staleTime: 10 * 60 * 1000,
          });

          if (__DEV__) {
            console.log('✅ Cache restored and critical queries prefetched');
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('Error prefetching after cache restore:', error);
          }
        }
      }

      setIsRestored(true);
    };

    checkRestored();
  }, [queryClient, user?.id]);

  return isRestored;
}










