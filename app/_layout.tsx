import { useEffect, useRef, useSyncExternalStore } from 'react';
import { SplashScreen, Stack, type ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from '@/shared/lib/navigation';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
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
import { ATTENDANCE_CATEGORY, bookingApi } from '@/features/booking';
import { useHairProfileSync, useUserStore } from '@/features/profile';
import { ModeSwitchOverlay, useActiveMode, useModeStore } from '@/features/stylist';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { registerPush } from '@/shared/lib/push';
import { useConsentSync } from '@/shared/config/consentSync';
import { startAnalytics, track } from '@/shared/lib/analytics';
import { darkTheme, ThemeProvider, useTheme, useThemePreference } from '@/shared/theme';
import { DialogHost } from '@/shared/ui/DialogHost';
import { useStackPresets } from '@/shared/ui/stackOptions';
import { queryClient } from '@/queryClient';
import { persistOptions } from '@/shared/utils/cachePersistence';

// Dev only: answer API calls from src/mocks until the backend is live. The env check is
// inlined at build time, so production bundles never include the mocks.
if (process.env.EXPO_PUBLIC_API_MOCKS === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/mocks');
}

SplashScreen.preventAutoHideAsync();
startAnalytics();

export const unstable_settings = { anchor: '(client)' };

/**
 * If a screen crashes, a calm page with a way back instead of the error's own text,
 * which is written for developers. Drawn without the app's providers (they're what
 * this replaces), so plain components and the dark palette.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const c = darkTheme.colors;
  return (
    <View style={[crash.page, { backgroundColor: c.bg }]}>
      <Text style={[crash.title, { color: c.text.primary }]}>Something went wrong</Text>
      <Text style={[crash.body, { color: c.text.secondary }]}>
        This screen ran into a problem. Try again, and if it keeps happening, restart the app.
      </Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={[crash.button, { backgroundColor: c.accent }]}
      >
        <Text style={[crash.label, { color: c.text.onAccent }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const crash = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  button: { marginTop: 12, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 },
  label: { fontSize: 16, fontWeight: '600' },
});

const useHydrated = (
  store: typeof useUserStore | typeof useModeStore | typeof useThemePreference
) => useSyncExternalStore(store.persist.onFinishHydration, store.persist.hasHydrated);

function RootNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const { push, modal, fade, overlay } = useStackPresets();
  const { isAuthenticated, isLoading, user } = useAuth();
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

  // A notification means something changed on the server: what shows it is out of date.
  const refreshFrom = (target: { bookingId?: string }) => {
    if (!target.bookingId) return;
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['stylist'] });
  };

  useNotifications(
    async target => {
      refreshFrom(target);
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
    [ATTENDANCE_CATEGORY],
    refreshFrom
  );

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Signing up continues into email verification, so the auth flow stays open until
  // the email is confirmed. (Only an explicit false counts: accounts saved before
  // emails were checked have no value at all, and they're all confirmed.)
  const emailUnconfirmed = isAuthenticated && user?.emailVerified === false;
  const inAuthFlowNow = !isAuthenticated || emailUnconfirmed;

  // A new stylist account opens in stylist mode, with the usual switch, once the
  // sign-up screens have closed (switching under them crashed).
  const startAs = useModeStore(s => s.startAs);
  useEffect(() => {
    if (!ready || !startAs || !isAuthenticated || inAuthFlowNow) return;
    const store = useModeStore.getState();
    store.setStartAs(null);
    if (startAs !== store.mode) store.beginSwitch(startAs);
  }, [ready, startAs, isAuthenticated, inAuthFlowNow]);

  // Opened the app signed in but with her email still unconfirmed (she left mid
  // sign-up): straight back to the code. Checked once at launch; sign-up and sign-in
  // take her there themselves.
  const launchChecked = useRef(false);
  useEffect(() => {
    if (!ready || launchChecked.current) return;
    launchChecked.current = true;
    if (isAuthenticated && user?.emailVerified === false) {
      setTimeout(() => router.push('/auth/verify-email'), 0);
    }
  }, [ready, isAuthenticated, user?.emailVerified, router]);

  // The splash stays up until we know who's here, so nobody sees the wrong screen first.
  if (!ready) return null;

  // Someone who has taken the quiz or signed in is inside the app, even as a guest.
  const entered = isAuthenticated || onboarded;
  const inAuthFlow = inAuthFlowNow;

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
        <Stack.Screen name="policy/[type]" />
        <Stack.Screen name="hair-profile/index" options={modal} />
        <Stack.Screen name="hair-profile/[section]" options={modal} />
        <Stack.Screen name="looks/index" />
        <Stack.Screen name="looks/area" options={modal} />
        <Stack.Screen name="looks/[id]" options={overlay} />
        <Stack.Screen name="stylist/[handle]" />
        <Stack.Screen name="who/[style]" options={modal} />
        <Stack.Screen
          name="work/[handle]"
          options={{ presentation: 'fullScreenModal', animation: 'fade', animationDuration: 200 }}
        />

        {/* Doing anything needs an account; a guest's tap is sent to sign up instead
            (see the account gate in AuthContext). */}
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="settings/report" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="settings/reports" />
          <Stack.Screen name="settings/appeal" options={modal} />
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
          <Stack.Screen name="shelf/scan" options={modal} />
          <Stack.Screen name="shelf/new-product" options={modal} />
          <Stack.Screen name="shelf/[id]" />
          <Stack.Screen name="collections/[id]" />
          <Stack.Screen name="collections/new" options={modal} />
          <Stack.Screen name="collections/save" options={modal} />
          <Stack.Screen name="care-plans/[id]" />
          <Stack.Screen name="care-plans/edit" options={modal} />
          <Stack.Screen name="edit-profile" options={modal} />
          <Stack.Screen name="insights" />
          <Stack.Screen name="username" options={modal} />
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
            {/* Last session's screens open straight away while fresh copies load. */}
            <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
              <AuthProvider>
                <BottomSheetModalProvider>
                  <RootNavigator />
                </BottomSheetModalProvider>
              </AuthProvider>
            </PersistQueryClientProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
