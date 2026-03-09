import { useEffect } from 'react';
import { useQueryClient, useIsRestoring } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Favorite } from '@/types/education';

const FAVORITES_QUERY_KEY = 'favorites';

/**
 * Hook to sync restored favorites list into per-item cache entries
 * This ensures useIsFavorite can read from cache immediately after restore
 */
export function useSyncFavoritesCache() {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    // Only run after restore completes
    if (isRestoring || !userId) return;

    // Get the restored favorites list
    const favoritesList = queryClient.getQueryData<Favorite[]>([FAVORITES_QUERY_KEY, userId]);

    if (favoritesList && Array.isArray(favoritesList)) {
      // Map each favorite to a per-item cache entry
      favoritesList.forEach((favorite) => {
        if (favorite.contentId) {
          queryClient.setQueryData([FAVORITES_QUERY_KEY, userId, favorite.contentId], true);
        }
      });

      if (__DEV__) {
        console.log(`✅ Synced ${favoritesList.length} favorites to per-item cache entries`);
      }
    }
  }, [isRestoring, userId, queryClient]);
}

