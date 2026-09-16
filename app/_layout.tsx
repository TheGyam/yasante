import { useEffect } from 'react';
import { Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useStackOptions } from '@/shared/ui/stackOptions';
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { ThemeProvider as LegacyThemeProvider } from '@/shared/legacy/theme/ThemeProvider';
import { AuthProvider } from '@/features/auth';
import { parseMoodBoardDeepLink, parseTreatmentDeepLink } from '@/features/planner';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { queryClient } from '@/queryClient';

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const screenOptions = useStackOptions();
  useNotifications();

  useEffect(() => {
    const open = ({ url }: { url: string }) => {
      const board = parseMoodBoardDeepLink(url);
      if (board) {
        router.push(`/(tabs)/planner/moodboard/${board.entryId}` as never);
        return;
      }
      const treatment = parseTreatmentDeepLink(url);
      if (treatment) {
        router.push(`/(tabs)/planner/treatments/edit/${treatment.treatmentId}` as never);
      }
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
    Lato_400Regular,
    Lato_700Bold,
  });

  // A few frames at most; avoids a flash of the system font.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <LegacyThemeProvider>
              <QueryClientProvider client={queryClient}>
                <AuthProvider>
                  <RootNavigator />
                </AuthProvider>
              </QueryClientProvider>
            </LegacyThemeProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
