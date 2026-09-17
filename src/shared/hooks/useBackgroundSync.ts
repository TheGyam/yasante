import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { offlineQueue } from '@/shared/lib/api/offlineQueue';
import { useNetworkStatus } from './useNetworkStatus';

interface UseBackgroundSyncOptions {
  enabled?: boolean;
  syncOnAppStateChange?: boolean;
}

/**
 * Hook to handle background sync when app becomes active
 * - Checks for new content when app becomes active
 * - Syncs pending mutations from offline queue
 * - Updates stale queries
 */
export function useBackgroundSync(options: UseBackgroundSyncOptions = {}) {
  const { enabled = true, syncOnAppStateChange = true } = options;
  const queryClient = useQueryClient();
  const { isConnected } = useNetworkStatus();
  const appState = useRef(AppState.currentState);
  const syncInProgressRef = useRef(false);

  // Process offline queue when online
  const processOfflineQueue = async () => {
    if (!isConnected || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    try {
      // Import API services dynamically to avoid circular dependencies
      const { api } = await import('@/api');

      // Process queued mutations
      await offlineQueue.processQueue(async (type: string, params: any) => {
        // Map mutation types to API calls
        switch (type) {
          case 'toggleFavorite':
            await api.favorites.toggle(params.userId, params.contentId);
            break;
          default:
            if (__DEV__) {
              console.warn(`Unknown mutation type: ${type}`);
            }
        }
      });

      // Refetch stale queries
      await queryClient.refetchQueries({
        stale: true,
        type: 'active',
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Background sync error:', error);
      }
    } finally {
      syncInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        syncOnAppStateChange
      ) {
        // App came to foreground, sync
        processOfflineQueue();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Runs on mount and again whenever the connection comes back.
    if (isConnected) {
      processOfflineQueue();
    }

    return () => {
      subscription.remove();
    };
  }, [enabled, syncOnAppStateChange, isConnected]);

  return {
    sync: processOfflineQueue,
    isSyncing: syncInProgressRef.current,
  };
}
