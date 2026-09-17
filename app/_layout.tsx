import { useEffect } from 'react';
import { Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useStackOptions } from '@/shared/ui/stackOptions';
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { AuthProvider } from '@/features/auth';
import { parsePlannerLink } from '@/features/planner';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { queryClient } from '@/queryClient';

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const screenOptions = useStackOptions();
  useNotifications();

  useEffect(() => {
    const open = ({ url }: { url: string }) => {
      const link = parsePlannerLink(url);
      if (link?.kind === 'board') router.push(`/(tabs)/planner/moodboard/${link.id}`);
      if (link?.kind === 'treatment') router.push(`/(tabs)/planner/treatments/edit/${link.id}`);
    };

    Linking.getInitialURL().then(url => url && open({ url }));
    const subscription = Linking.addEventListener('url', open);
    return () => subscription.remove();
  }, [router]);

  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack screenOptions={screenOptions} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  // A few frames at most; avoids a flash of the system font.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <BottomSheetModalProvider>
                  <RootNavigator />
                </BottomSheetModalProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
