import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/shared/theme/ThemeProvider';
import { AuthProvider } from '@/features/auth';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { LogBox, Linking, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useFonts } from '@expo-google-fonts/lato/useFonts';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { parseMoodBoardDeepLink, parseTreatmentDeepLink } from '@/features/planner';

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
  console.log('=== YASANTE APP STARTING ===');
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
    Linking.getInitialURL().then(url => {
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
  const [fontsLoaded, fontError] = useFonts({
    Lato_400Regular,
    Lato_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && __DEV__) {
      console.log('Lato font loaded successfully');
    }
  }, [fontsLoaded]);

  if (fontError) {
    console.warn('Font loading error:', fontError);
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
