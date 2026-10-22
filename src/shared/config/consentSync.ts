import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/shared/lib/api/client';
import { useRouter } from '@/shared/lib/navigation';
import { pushPermission, registerPush } from '@/shared/lib/push';
import { confirm } from '@/shared/ui/dialog';
import { useConsentStore, useUnanswered, type ServerConsent } from './consentStore';
import { POLICY_CHANGES, POLICY_VERSION } from './policies';

/** An attempt that hasn't settled by then is given up on; the records stay pending. */
const GIVE_UP_MS = 20_000;

// A request stuck behind a token refresh mustn't hold every later one hostage.
function withTimeout<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const giveUp = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out')), GIVE_UP_MS);
  });
  return Promise.race([request, giveUp]).finally(() => clearTimeout(timer));
}

let inFlight: Promise<void> | null = null;

/**
 * Sends consent records that only exist on this device. Each is a record — who,
 * which purpose, granted or refused, which policy version, when, from where — so
 * the server keeps a history rather than one switch.
 */
export function syncConsents(): Promise<void> {
  if (inFlight) return inFlight;
  const pending = useConsentStore.getState().pendingSync();
  if (!pending.length) return Promise.resolve();

  const send = apiClient
    .post('/api/consents/', {
      consents: pending.map(({ purpose, granted, policyVersion, updatedAt }) => ({
        purpose,
        granted,
        policyVersion,
        recordedAt: updatedAt,
        source: Platform.OS,
      })),
    })
    .then(() => useConsentStore.getState().markSynced(pending, new Date().toISOString()));

  inFlight = withTimeout(send)
    // Stays pending; the next change, launch or return to the app tries again.
    .catch(error => {
      if (__DEV__) console.warn('[consents] not synced yet:', error?.message ?? error);
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Takes the account's answers from the server, so a choice made on another device
 * holds on this one too. Choices this device hasn't sent yet still win.
 */
export async function loadConsents(): Promise<void> {
  const askedAt = new Date().toISOString();
  try {
    const { data } = await withTimeout(
      apiClient.get<{ consents: ServerConsent[] }>('/api/consents/')
    );
    useConsentStore.getState().takeServerAnswers(data.consents, askedAt);
  } catch (error) {
    // The device's answers stand until the next launch or return to the app.
    if (__DEV__) console.warn('[consents] not loaded:', (error as Error)?.message ?? error);
  }
}

// Send first, so the server's answers include everything this device has chosen.
const syncThenLoad = () => syncConsents().then(loadConsents);

/**
 * While signed in: send and load now and when the app comes back, and send
 * whenever a choice changes.
 */
export function useConsentSync(signedIn: boolean) {
  useEffect(() => {
    // Signed out, or someone else signing in: their answers have to arrive first.
    useConsentStore.getState().setLoaded(false);
    if (!signedIn) return;
    void syncThenLoad();
    const unsubscribe = useConsentStore.subscribe((state, previous) => {
      if (state.consents !== previous.consents) void syncConsents();
    });
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') void syncThenLoad();
    });
    return () => {
      unsubscribe();
      foreground.remove();
    };
  }, [signedIn]);
}

/**
 * Asks for the analytics choice once a launch, while she's signed in and hasn't given
 * one: right after sign-up, and for accounts made before it was asked. `canAsk` is
 * false while sign-up's own screens are still open.
 */
export function useAskForAnalytics(canAsk: boolean) {
  const router = useRouter();
  const unanswered = useUnanswered('analytics', true);
  const policyChanged = usePolicyChanged();
  const asked = useRef(false);
  useEffect(() => {
    // One question a launch: a policy notice goes first, and this waits for next time.
    if (!canAsk || !unanswered || asked.current || policyChanged || toldThisLaunch) return;
    // A moment after the screens that signing in closes have gone.
    const timer = setTimeout(() => {
      asked.current = true;
      router.push('/settings/privacy-choices' as never);
    }, 600);
    return () => clearTimeout(timer);
  }, [canAsk, unanswered, policyChanged, router]);
}

const usePolicyChanged = () =>
  useConsentStore(
    s =>
      s.loaded &&
      (s.consents.privacy?.policyVersion !== POLICY_VERSION ||
        s.consents.terms?.policyVersion !== POLICY_VERSION)
  );

/** Set once something has asked her a question this launch: one is enough. */
let toldThisLaunch = false;

const NOTIFICATIONS_ASKED = 'yasante.notifications.asked';
const ASK_AGAIN_AFTER = 14 * 24 * 60 * 60 * 1000;

/**
 * Notifications, asked with a reason, never at the door: once she's in and nothing
 * else has asked her anything this launch. "Not now" waits two weeks; the phone's
 * own question only follows a yes, so its one chance isn't spent on a stranger.
 * Turning on a care plan reminder asks too.
 */
export function useAskForNotifications(canAsk: boolean, stylist = false) {
  const analyticsUnanswered = useUnanswered('analytics', true);
  const policyChanged = usePolicyChanged();
  const asked = useRef(false);
  useEffect(() => {
    if (!canAsk || asked.current || analyticsUnanswered || policyChanged || toldThisLaunch) return;
    const timer = setTimeout(async () => {
      asked.current = true;
      const { granted, canAsk: phoneWouldAsk } = await pushPermission();
      if (granted) return void registerPush();
      const last = Number(await AsyncStorage.getItem(NOTIFICATIONS_ASKED).catch(() => 0)) || 0;
      if (!phoneWouldAsk || Date.now() - last < ASK_AGAIN_AFTER || toldThisLaunch) return;
      toldThisLaunch = true;
      await AsyncStorage.setItem(NOTIFICATIONS_ASKED, String(Date.now())).catch(() => {});
      const yes = await confirm({
        title: 'Turn on notifications?',
        message: stylist
          ? 'So you know when a client asks for a date, when an appointment is near, and when someone answers you.'
          : 'So you know when a stylist answers, when your appointment is near, and when it’s time for your care plan.',
        confirmLabel: 'Turn on',
        cancelLabel: 'Not now',
      });
      if (yes) void registerPush(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [canAsk, analyticsUnanswered, policyChanged, stylist]);
}

/**
 * Tells her once, as the terms and privacy policy promise, when they've changed since
 * she last saw them. Either answer counts as seen, and is kept with her consent records.
 */
export function useTellAboutPolicyChange(canAsk: boolean) {
  const router = useRouter();
  const changed = usePolicyChanged();
  const told = useRef(false);
  useEffect(() => {
    if (!canAsk || !changed || told.current) return;
    told.current = true;
    toldThisLaunch = true;
    void confirm({
      title: 'We’ve updated our terms and privacy policy',
      message: `${POLICY_CHANGES} You can read them any time in Settings.`,
      confirmLabel: 'Read them',
      cancelLabel: 'OK',
    }).then(read => {
      useConsentStore.getState().setConsent('terms', true);
      useConsentStore.getState().setConsent('privacy', true);
      // Settings ends with both, side by side.
      if (read) router.push('/settings');
    });
  }, [canAsk, changed, router]);
}
