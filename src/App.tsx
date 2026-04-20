import React, { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useIsRestoring } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { asyncStoragePersister } from '@/utils/cachePersistence';
import { offlineQueue } from '@/api/utils/offlineQueue';
import { useSyncFavoritesCache } from '@/hooks/useSyncFavoritesCache';
import { queryClient } from '@/queryClient';

// Re-export for backwards compatibility
export { queryClient };

// Enable comprehensive logging in dev
if (__DEV__) {
  LogBox.ignoreLogs([]);
  console.log('=== KALON APP STARTING ===');
}

function AppContent({ children }: { children?: React.ReactNode }) {
  const { theme, colorScheme } = useTheme();
  useNotifications();
  const isRestoring = useIsRestoring();
  
  // Sync favorites list to per-item cache entries after restore
  useSyncFavoritesCache();

  // Initialize offline queue on app start
  useEffect(() => {
    offlineQueue.restore().catch((error) => {
      if (__DEV__) {
        console.error('Failed to restore offline queue:', error);
      }
    });
  }, []);

  // Show loading state while cache is restoring
  if (isRestoring) {
    return (
      <>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: asyncStoragePersister,
              maxAge: 24 * 60 * 60 * 1000, // 24 hours
              buster: '1.0.0', // Change this when you want to invalidate cache
            }}
          >
            <AppContent>
              {/* Expo Router handles routing via app/_layout.tsx */}
            </AppContent>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

