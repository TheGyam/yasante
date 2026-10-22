import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { useCarePlanReminders } from '@/features/planner';
import { useHairProfileSync, useUserStore } from '@/features/profile';
import { ModeSwitchOverlay, useActiveMode, useModeStore } from '@/features/stylist';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { registerPush } from '@/shared/lib/push';
import {
  useAskForAnalytics,
  useConsentSync,
  useTellAboutPolicyChange,
} from '@/shared/config/consentSync';
import { featuresQuery } from '@/shared/config/features';
import { startAnalytics, track } from '@/shared/lib/analytics';
import { reportError, startCrashReports } from '@/shared/lib/crashReport';
import { syncTimeZone } from '@/shared/lib/timeZone';
import { checkpoint } from '@/boot';
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

checkpoint('layout loaded');
SplashScreen.preventAutoHideAsync();
startCrashReports();
startAnalytics();

// However start-up goes, nobody is left looking at the splash: after this long it
// lifts, and whatever's underneath (the app, or the error page) shows.
const SPLASH_AT_MOST_MS = 6000;
setTimeout(() => {
  checkpoint('splash timer fired');
  SplashScreen.hideAsync()
    .then(() => checkpoint('splash hidden by timer'))
    .catch(e => checkpoint(`splash hide failed: ${String(e?.message ?? e).slice(0, 120)}`));
}, SPLASH_AT_MOST_MS);
// Waiting for what's saved on the phone is normally instant; past this, carry on
// without it and say which part was slow.
const START_AT_MOST_MS = 3000;

export const unstable_settings = { anchor: '(client)' };

/**
 * If a screen crashes, a calm page with a way back instead of the error's own text,
 * which is written for developers. Drawn without the app's providers (they're what
 * this replaces), so plain components and the dark palette.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const c = darkTheme.colors;
  const [details, setDetails] = useState(false);
  useEffect(() => {
    // Drawn under the splash if it happened at start-up: lift it, or this is never seen.
    SplashScreen.hideAsync().catch(() => {});
    reportError(error, { context: { where: 'error boundary' } });
  }, [error]);
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
      {/* For whoever's helping fix it: the error itself, only when asked for. */}
      <Pressable onPress={() => setDetails(d => !d)} accessibilityRole="button" hitSlop={12}>
        <Text style={[crash.body, { color: c.text.tertiary, fontSize: 13 }]}>
          {details ? 'Hide details' : 'Show details'}
        </Text>
      </Pressable>
      {details && (
        <Text selectable style={[crash.body, { color: c.text.tertiary, fontSize: 12 }]}>
          {error.message}
        </Text>
      )}
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
  const settled = userHydrated && modeHydrated && themeHydrated && !isLoading;
  useEffect(() => checkpoint('navigator mounted'), []);
  // Past the limit, go on without whatever hasn't answered, and report which it was.
  const [waitedEnough, setWaitedEnough] = useState(false);
  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => setWaitedEnough(true), START_AT_MOST_MS);
    return () => clearTimeout(timer);
  }, [settled]);
  useEffect(() => {
    if (waitedEnough && !settled) {
      checkpoint(
        `stalled: user=${userHydrated} mode=${modeHydrated} theme=${themeHydrated} authLoading=${isLoading}`
      );
      reportError(new Error('Start-up stalled'), {
        kind: 'stall',
        context: { userHydrated, modeHydrated, themeHydrated, authLoading: isLoading },
      });
    }
    // Once, when the wait runs out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitedEnough]);
  const ready = settled || waitedEnough;

  // Answers given before signing up reach the account once there is one; so do
  // consent choices, which are recorded on the device first.
  useHairProfileSync();
  // Care plan reminders are set on the phone itself, from her plans.
  useCarePlanReminders();
  useConsentSync(isAuthenticated);

  // Fetched once up front, so a screen that gates on a switch never waits for it.
  useEffect(() => {
    queryClient.prefetchQuery(featuresQuery);
  }, []);
  // Which switches apply can depend on who's asking (see /api/features/), so a
  // sign-in or sign-out needs a fresh answer rather than the signed-out one.
  const previousUserId = useRef(user?.id);
  useEffect(() => {
    if (previousUserId.current !== user?.id) {
      queryClient.invalidateQueries({ queryKey: featuresQuery.queryKey });
    }
    previousUserId.current = user?.id;
  }, [user?.id]);

  // Where the server sends her notifications: this phone, once she's signed in.
  useEffect(() => {
    if (isAuthenticated && !isLoading) registerPush();
    // How notifications word times: this phone's clock.
    if (isAuthenticated && !isLoading && user?.id) syncTimeZone(user.id);
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
    if (!ready) return;
    checkpoint('ready');
    SplashScreen.hideAsync()
      .then(() => checkpoint('splash hidden'))
      .catch(e => checkpoint(`splash hide failed: ${String(e?.message ?? e).slice(0, 120)}`));
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

  // Her privacy choices, once she's past sign-up and in the app.
  const inApp = ready && isAuthenticated && !inAuthFlowNow && !startAs;
  useAskForAnalytics(inApp);
  useTellAboutPolicyChange(inApp);

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
        <Stack.Screen name="looks/comments" options={modal} />
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
          <Stack.Screen name="settings/privacy-choices" options={modal} />
          <Stack.Screen name="finish" />
        </Stack.Protected>

        <Stack.Screen name="invite/[code]" />
        <Stack.Screen name="claim/[code]" />

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
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    YasanteMarks: require('../assets/fonts/YasanteMarks.ttf'),
  });

  useEffect(() => {
    if (fontError) reportError(fontError, { context: { where: 'fonts' } });
    if (fontsLoaded || fontError) checkpoint(fontError ? 'fonts failed' : 'fonts loaded');
  }, [fontsLoaded, fontError]);
  // A font that fails to load isn't a reason to stay on the splash: the system's stands in.
  if (!fontsLoaded && !fontError) return null;

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
