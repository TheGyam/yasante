import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

// React Native has no window focus: coming back to the app is the focus event, so
// anything stale refetches then (a booking accepted while she was away, say).
if (Platform.OS !== 'web') {
  focusManager.setEventListener(handleFocus => {
    const subscription = AppState.addEventListener('change', state =>
      handleFocus(state === 'active')
    );
    return () => subscription.remove();
  });
  // The phone's connection, so loads wait while it's off and run again the moment it's
  // back (the browser tells React Query itself; a phone has to be asked).
  onlineManager.setEventListener(setOnline =>
    NetInfo.addEventListener(state => setOnline(state.isConnected !== false))
  );
}

// Create a client with optimized cache settings for social media app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A refusal (404, 403…) won't change on a second try; only no answer or a 5xx might.
      retry: (failures, error) => {
        const status = (error as { response?: { status?: number } }).response?.status ?? 0;
        return failures < 2 && (status === 0 || status >= 500);
      },
      // Dynamic staleTime based on query type
      staleTime: query => {
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
      // Returning to the app (see focusManager above) refetches whatever is stale.
      refetchOnWindowFocus: true,
      // Always refetch the feed on mount; anything else when it's stale, so a screen
      // opened again never shows an old copy of something that has changed.
      refetchOnMount: query =>
        query.queryKey[0] === 'content' && query.queryKey[1] === 'infinite' ? 'always' : true,
      // Don't use refetchInterval - use AppState-aware polling hook instead
      refetchInterval: false,
      refetchOnReconnect: true, // Refetch when reconnecting
    },
  },
});
