import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { seedMockData } from '@/utils/seed';
import { LogBox, Linking } from 'react-native';
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
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'DeliusSwashCaps-Regular': 'https://fonts.gstatic.com/s/deliusswashcaps/v18/JOpUQ0Be7R1Kq8r9HjSpDIV6AQ.woff2',
  });

  if (!fontsLoaded) {
    return null; // or a loading screen
  }

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

