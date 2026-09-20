import { useEffect, useSyncExternalStore } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { useRouter } from '@/shared/lib/navigation';
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
import { AuthProvider, useAuth, useAuthStore } from '@/features/auth';
import { useUserStore } from '@/features/profile';
import { ModeSwitchOverlay, useActiveMode, useModeStore } from '@/features/stylist';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { DialogHost } from '@/shared/ui/DialogHost';
import { useStackPresets } from '@/shared/ui/stackOptions';
import { queryClient } from '@/queryClient';

// Dev only: answer API calls from src/mocks until the backend is live. The env check is
// inlined at build time, so production bundles never include the mocks.
if (process.env.EXPO_PUBLIC_API_MOCKS === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/mocks');
}

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(client)' };

const useHydrated = (store: typeof useUserStore | typeof useModeStore) =>
  useSyncExternalStore(store.persist.onFinishHydration, store.persist.hasHydrated);

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const { push, modal, fade } = useStackPresets();
  const { isAuthenticated, isLoading, user } = useAuth();
  const phoneDeferred = useAuthStore(s => s.phoneDeferred);
  const onboarded = useUserStore(s => s.onboardingCompleted);
  const mode = useActiveMode();
  const userHydrated = useHydrated(useUserStore);
  const modeHydrated = useHydrated(useModeStore);
  const ready = userHydrated && modeHydrated && !isLoading;

  useNotifications(target => {
    if (target.mode) useModeStore.getState().setMode(target.mode);
    if (target.url) router.push(target.url as never);
  });

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The splash stays up until we know who's here, so nobody sees the wrong screen first.
  if (!ready) return null;

  // Someone who has taken the quiz or signed in is inside the app, even as a guest.
  const entered = isAuthenticated || onboarded;
  // Signing up continues into phone verification, so the auth flow stays open until
  // the phone is checked or put off.
  const inAuthFlow = !isAuthenticated || (!user?.phoneVerified && !phoneDeferred);

  return (
    <>
      <StatusBar style={theme.statusBar} />
      {/*
        Guards, not redirects: when a guard flips, its screens leave the history and the
        router lands on the first screen still allowed. Signing in closes the auth modal,
        finishing the first-run quiz swaps welcome for the app, and switching mode swaps
        one set of tabs for the other. Nothing is pushed.
      */}
      <Stack screenOptions={push}>
        <Stack.Protected guard={!entered}>
          <Stack.Screen name="index" options={fade} />
          <Stack.Screen name="onboarding/quiz" />
        </Stack.Protected>

        <Stack.Protected guard={entered && mode === 'client'}>
          <Stack.Screen name="(client)" options={fade} />
        </Stack.Protected>
        <Stack.Protected guard={entered && mode === 'stylist'}>
          <Stack.Screen name="(stylist)" options={fade} />
        </Stack.Protected>

        <Stack.Protected guard={entered}>
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/privacy" />
          <Stack.Screen name="settings/faqs" />
          <Stack.Screen name="settings/report" />
          <Stack.Screen name="hair-profile" options={modal} />
          <Stack.Screen name="stylist-setup" options={modal} />
          <Stack.Screen name="menu/index" />
          <Stack.Screen name="menu/paste" options={modal} />
          <Stack.Screen name="menu/[id]" options={modal} />
          <Stack.Screen name="boards/new" options={modal} />
          <Stack.Screen name="boards/[id]/edit" options={modal} />
          <Stack.Screen name="treatments/new" options={modal} />
          <Stack.Screen name="treatments/[id]" options={modal} />
          <Stack.Screen name="edit-profile" options={modal} />
        </Stack.Protected>

        <Stack.Screen name="invite/[code]" />

        <Stack.Protected guard={inAuthFlow}>
          <Stack.Screen name="auth" options={modal} />
        </Stack.Protected>
      </Stack>
      <ModeSwitchOverlay />
      <DialogHost />
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
