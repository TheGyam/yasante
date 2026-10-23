import { useState, useEffect } from 'react';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Hook to monitor network status and handle offline/online transitions
 * Uses @react-native-community/netinfo if available, otherwise falls back to basic detection
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Try to use @react-native-community/netinfo if available
    const initNetInfo = async () => {
      try {
        const NetInfo = await import('@react-native-community/netinfo');

        // Get initial network state
        NetInfo.default.fetch().then((state: any) => {
          setNetworkStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? null,
            type: state.type,
          });
        });

        // Subscribe to network state changes
        unsubscribe = NetInfo.default.addEventListener((state: any) => {
          setNetworkStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? null,
            type: state.type,
          });
        });
      } catch (error) {
        // NetInfo not available, assume online
        if (__DEV__) {
          console.warn('NetInfo not available, assuming online:', error);
        }
        setNetworkStatus({
          isConnected: true,
          isInternetReachable: true,
          type: null,
        });
      }
    };

    initNetInfo();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    ...networkStatus,
    isOffline: !networkStatus.isConnected || networkStatus.isInternetReachable === false,
  };
}
