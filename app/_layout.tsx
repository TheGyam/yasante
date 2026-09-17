import { useEffect, useSyncExternalStore } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  useFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { AuthProvider, useAuth } from '@/features/auth';
import { useUserStore } from '@/features/profile';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { useStackPresets } from '@/shared/ui/stackOptions';
import { queryClient } from '@/queryClient';

SplashScreen.preventAutoHideAsync();

// Anything that can't find its place falls back to the app itself.
export const unstable_settings = { anchor: '(tabs)' };

const { persist } = useUserStore;

function RootNavigator() {
  const theme = useTheme();
  const { push, modal, fade } = useStackPresets();
  const { isAuthenticated, isLoading } = useAuth();
  const onboarded = useUserStore(s => s.onboardingCompleted);
  const hydrated = useSyncExternalStore(persist.onFinishHydration, persist.hasHydrated);
  const ready = hydrated && !isLoading;
  useNotifications();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The splash stays up until we know who's here, so nobody sees the wrong screen first.
  if (!ready) return null;

  // Someone who has taken the quiz or signed in is inside the app, even as a guest.
  const entered = isAuthenticated || onboarded;

  return (
    <>
      <StatusBar style={theme.statusBar} />
      {/*
        Guards, not redirects: when a guard flips, its screens leave the history and the
        router lands on the first screen still allowed. Signing in closes the auth modal;
        finishing the first-run quiz replaces welcome with the app. Nothing is pushed.
      */}
      <Stack screenOptions={push}>
        <Stack.Protected guard={!entered}>
          <Stack.Screen name="index" options={fade} />
          <Stack.Screen name="onboarding/quiz" />
        </Stack.Protected>

        <Stack.Protected guard={entered}>
          <Stack.Screen name="(tabs)" options={fade} />
          <Stack.Screen name="hair-profile" options={modal} />
          <Stack.Screen name="boards/new" options={modal} />
          <Stack.Screen name="boards/[id]/edit" options={modal} />
          <Stack.Screen name="treatments/new" options={modal} />
          <Stack.Screen name="treatments/[id]" options={modal} />
          <Stack.Screen name="edit-profile" options={modal} />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="auth" options={modal} />
        </Stack.Protected>
      </Stack>
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
