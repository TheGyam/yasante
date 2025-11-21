import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { seedMockData } from '@/utils/seed';
import { LogBox, Linking, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { parseMoodBoardDeepLink, parseTreatmentDeepLink } from '@/utils/deepLinks';

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
  const router = useRouter();
  
  // Only use notifications if available (requires dev build)
  try {
    useNotifications();
  } catch (error) {
    // Notifications not available in Expo Go
    if (__DEV__) {
      console.log('Notifications not available (requires dev build)');
    }
  }

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      
      // Parse moodboard deep link
      const moodboardLink = parseMoodBoardDeepLink(url);
      if (moodboardLink) {
        router.push(`/(tabs)/planner/moodboard/${moodboardLink.entryId}` as any);
        return;
      }
      
      // Parse treatment deep link
      const treatmentLink = parseTreatmentDeepLink(url);
      if (treatmentLink) {
        router.push(`/(tabs)/planner/treatments/edit/${treatmentLink.treatmentId}` as any);
        return;
      }
    };

    // Handle initial URL (if app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'fade', // Use fade animation to work better with shared elements
      }}
    />
  );
}

export default function RootLayout() {
  // Load Delius Swash Caps font from local assets
  // The key 'DeliusSwashCaps-Regular' is the name we'll use in fontFamily
  const [fontsLoaded, fontError] = useFonts({
    'DeliusSwashCaps-Regular': require('../assets/fonts/DeliusSwashCaps-Regular.ttf'),
  });

  // Log when font is loaded for debugging
  useEffect(() => {
    if (fontsLoaded) {
      console.log('Delius Swash Caps font loaded successfully');
    }
  }, [fontsLoaded]);

  // Log errors for debugging
  if (fontError) {
    console.warn('Font loading error:', fontError);
    console.warn('Please ensure DeliusSwashCaps-Regular.ttf is in assets/fonts/ folder');
  }

  // Show app immediately - fonts will apply when loaded
  // React Native will use system font as fallback if custom font isn't available
  // The font will be applied automatically once loaded

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

