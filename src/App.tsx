import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { LogBox } from 'react-native';
import { asyncStoragePersister } from '@/utils/cachePersistence';

// Create a client with optimized cache settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10 * 60 * 1000, // 10 minutes (increased from 5)
      gcTime: 30 * 60 * 1000, // 30 minutes (garbage collection time)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      refetchOnReconnect: true, // Refetch when reconnecting
    },
  },
});

// Enable comprehensive logging in dev
if (__DEV__) {
  LogBox.ignoreLogs([]);
  console.log('=== KALON APP STARTING ===');
}

function AppContent({ children }: { children?: React.ReactNode }) {
  const { theme, colorScheme } = useTheme();
  useNotifications();

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

