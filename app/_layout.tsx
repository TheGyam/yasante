import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { seedMockData } from '@/utils/seed';
import { LogBox } from 'react-native';
import { useEffect } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Enable comprehensive logging in dev
if (__DEV__) {
  LogBox.ignoreLogs([]);
  console.log('=== KALON APP STARTING ===');
  seedMockData();
}

function RootLayoutNav() {
  const { theme, colorScheme } = useTheme();
  
  // Only use notifications if available (requires dev build)
  try {
    useNotifications();
  } catch (error) {
    // Notifications not available in Expo Go
    if (__DEV__) {
      console.log('Notifications not available (requires dev build)');
    }
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RootLayoutNav />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

