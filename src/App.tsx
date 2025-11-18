import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { seedMockData } from '@/utils/seed';
import { LogBox } from 'react-native';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Enable comprehensive logging in dev
if (__DEV__) {
  LogBox.ignoreLogs([]);
  console.log('=== KALON APP STARTING ===');
  
  // Seed mock data in dev mode
  seedMockData();
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
          <QueryClientProvider client={queryClient}>
            <AppContent>
              {/* Expo Router handles routing via app/_layout.tsx */}
            </AppContent>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

