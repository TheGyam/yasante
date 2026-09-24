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
import { ATTENDANCE_CATEGORY, bookingApi } from '@/features/booking';
import { useHairProfileSync, useUserStore } from '@/features/profile';
import { ModeSwitchOverlay, useActiveMode, useModeStore } from '@/features/stylist';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { registerPush } from '@/shared/lib/push';
import { useConsentSync } from '@/shared/config/consentSync';
import { startAnalytics, track } from '@/shared/lib/analytics';
import { ThemeProvider, useTheme, useThemePreference } from '@/shared/theme';
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
startAnalytics();

export const unstable_settings = { anchor: '(client)' };

const useHydrated = (
  store: typeof useUserStore | typeof useModeStore | typeof useThemePreference
) => useSyncExternalStore(store.persist.onFinishHydration, store.persist.hasHydrated);

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const { push, modal, fade, overlay } = useStackPresets();
  const { isAuthenticated, isLoading, user } = useAuth();
  const phoneDeferred = useAuthStore(s => s.phoneDeferred);
  const onboarded = useUserStore(s => s.onboardingCompleted);
  const mode = useActiveMode();
  const userHydrated = useHydrated(useUserStore);
  const modeHydrated = useHydrated(useModeStore);
  // The chosen Appearance too: until it's read back, a Light choice would flash the
  // phone's dark (or the reverse) between the splash and the first screen.
  const themeHydrated = useHydrated(useThemePreference);
  const ready = userHydrated && modeHydrated && themeHydrated && !isLoading;

  // Answers given before signing up reach the account once there is one; so do
  // consent choices, which are recorded on the device first.
  useHairProfileSync();
  useConsentSync(isAuthenticated);

  // Where the server sends her notifications: this phone, once she's signed in.
  useEffect(() => {
    if (isAuthenticated && !isLoading) registerPush();
  }, [isAuthenticated, isLoading, user?.id]);

  useNotifications(
    async target => {
      if (target.mode) useModeStore.getState().setMode(target.mode);
      // The reminder's buttons answer from the notification itself: "coming" is
      // sent there and then; "can't make it" opens the cancel, with its warning.
      if (target.bookingId && target.action === ATTENDANCE_CATEGORY.actions[0].id) {
        await bookingApi
          .confirmAttendance(target.bookingId)
          .then(() => track('confirm_attendance', { from: 'notification' }))
          .catch(() => {});
      }
      if (target.bookingId && target.action === ATTENDANCE_CATEGORY.actions[1].id) {
        router.push(`/bookings/${target.bookingId}?cancel=1` as never);
        return;
      }
      if (target.url) router.push(target.url as never);
    },
    [ATTENDANCE_CATEGORY]
  );

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

        {/* Open to everyone, so a shared link works before any sign-up or quiz. */}
        <Stack.Protected guard={mode === 'client'}>
          <Stack.Screen name="(client)" options={fade} />
        </Stack.Protected>
        <Stack.Protected guard={entered && mode === 'stylist'}>
          <Stack.Screen name="(stylist)" options={fade} />
        </Stack.Protected>

        {/* Anyone can look around: looks, stylists' pages, settings. */}
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="settings/faqs" />
        <Stack.Screen name="hair-profile/index" options={modal} />
        <Stack.Screen name="hair-profile/[section]" options={modal} />
        <Stack.Screen name="looks/index" />
        <Stack.Screen name="looks/area" options={modal} />
        <Stack.Screen name="looks/[id]" options={overlay} />
        <Stack.Screen name="stylist/[handle]" />

        {/* Doing anything needs an account; a guest's tap is sent to sign up instead
            (see the account gate in AuthContext). */}
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="settings/report" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="stylist-setup" options={modal} />
          <Stack.Screen name="availability" options={modal} />
          <Stack.Screen name="payment-methods" options={modal} />
          <Stack.Screen name="numbers" />
          <Stack.Screen name="menu/index" />
          <Stack.Screen name="menu/paste" options={modal} />
          <Stack.Screen name="menu/[id]" options={modal} />
          <Stack.Screen name="portfolio/import" options={modal} />
          <Stack.Screen name="looks/new" options={modal} />
          <Stack.Screen name="looks/options" options={modal} />
          <Stack.Screen name="looks/mine" />
          <Stack.Screen name="book/[handle]" options={modal} />
          <Stack.Screen name="bookings/index" />
          <Stack.Screen name="bookings/[id]" />
          <Stack.Screen name="bookings/move" options={modal} />
          <Stack.Screen name="close-out/[id]" options={modal} />
          <Stack.Screen name="waitlist/[handle]" options={modal} />
          <Stack.Screen name="requests/[id]" />
          <Stack.Screen name="review/[id]" options={modal} />
          <Stack.Screen name="review/report" options={modal} />
          <Stack.Screen name="check-in/[id]" options={modal} />
          <Stack.Screen name="shelf/index" />
          <Stack.Screen name="shelf/add" options={modal} />
          <Stack.Screen name="shelf/[id]" />
          <Stack.Screen name="collections/[id]" />
          <Stack.Screen name="collections/new" options={modal} />
          <Stack.Screen name="collections/save" options={modal} />
          <Stack.Screen name="care-plans/[id]" />
          <Stack.Screen name="care-plans/edit" options={modal} />
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
