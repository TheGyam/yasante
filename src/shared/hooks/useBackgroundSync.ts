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
          // The goal endpoints take the goal itself; the user comes from the token.
          case 'createGoal':
            await api.goals.create(params.data);
            break;
          case 'updateGoal':
            await api.goals.update(params.goalId, params.data);
            break;
          case 'deleteGoal':
            await api.goals.delete(params.goalId);
            break;
          // Add more mutation types as needed
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

    // Initial sync if online
    if (isConnected) {
      processOfflineQueue();
    }

    return () => {
      subscription.remove();
    };
  }, [enabled, syncOnAppStateChange, isConnected]);

  // Also sync when network comes back online
  useEffect(() => {
    if (enabled && isConnected && !syncInProgressRef.current) {
      processOfflineQueue();
    }
  }, [enabled, isConnected]);

  return {
    sync: processOfflineQueue,
    isSyncing: syncInProgressRef.current,
  };
}










