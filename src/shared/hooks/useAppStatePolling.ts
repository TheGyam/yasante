import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStatePollingOptions {
  enabled?: boolean;
  maxBackoff?: number;
  backoffMultiplier?: number;
}

/**
 * Hook for AppState-aware polling with exponential backoff
 * Only polls when app is active, respects rate limits with backoff
 */
export function useAppStatePolling(
  callback: () => void | Promise<void>,
  baseInterval: number = 30000,
  options: UseAppStatePollingOptions = {}
) {
  const { enabled = true, maxBackoff = 5 * 60 * 1000, backoffMultiplier = 1.5 } = options;
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(baseInterval);
  const consecutiveErrorsRef = useRef(0);

  // Reset backoff on success
  const resetBackoff = () => {
    backoffRef.current = baseInterval;
    consecutiveErrorsRef.current = 0;
  };

  // Increase backoff on error
  const increaseBackoff = () => {
    consecutiveErrorsRef.current += 1;
    backoffRef.current = Math.min(
      baseInterval * Math.pow(backoffMultiplier, consecutiveErrorsRef.current),
      maxBackoff
    );
  };

  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, resume polling
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background, pause polling
        stopPolling();
      }
      appState.current = nextAppState;
    };

    const startPolling = () => {
      stopPolling();
      const poll = async () => {
        if (appState.current !== 'active') return;
        try {
          await callback();
          resetBackoff();
        } catch (error) {
          if (__DEV__) {
            console.warn('Polling error, increasing backoff:', error);
          }
          increaseBackoff();
        }
        if (appState.current === 'active') {
          intervalRef.current = setTimeout(poll, backoffRef.current);
        }
      };
      poll();
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (appState.current === 'active') {
      startPolling();
    }

    return () => {
      subscription.remove();
      stopPolling();
    };
  }, [callback, baseInterval, enabled, maxBackoff, backoffMultiplier]);

  return { resetBackoff, increaseBackoff };
}
