import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { apiClient } from '@/shared/lib/api/client';
import { useRouter } from '@/shared/lib/navigation';
import { confirm } from '@/shared/ui/dialog';
import { useConsentStore, useUnanswered, type ServerConsent } from './consentStore';
import { POLICY_VERSION, PRIVACY_ROUTE } from './policies';

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
  const asked = useRef(false);
  useEffect(() => {
    if (!canAsk || !unanswered || asked.current) return;
    // A moment after the screens that signing in closes have gone.
    const timer = setTimeout(() => {
      asked.current = true;
      router.push('/settings/privacy-choices' as never);
    }, 600);
    return () => clearTimeout(timer);
  }, [canAsk, unanswered, router]);
}

/**
 * Tells her once, as the privacy policy promises, when it has changed since she last
 * saw it. Either answer counts as seen, and is kept with her consent records.
 */
export function useTellAboutPolicyChange(canAsk: boolean) {
  const router = useRouter();
  const changed = useConsentStore(
    s => s.loaded && s.consents.privacy?.policyVersion !== POLICY_VERSION
  );
  const told = useRef(false);
  useEffect(() => {
    if (!canAsk || !changed || told.current) return;
    told.current = true;
    void confirm({
      title: 'We’ve updated our privacy policy',
      message:
        'It says what we collect, why, and the choices you have. You can read it any time in Settings.',
      confirmLabel: 'Read it',
      cancelLabel: 'OK',
    }).then(read => {
      useConsentStore.getState().setConsent('privacy', true);
      if (read) router.push(PRIVACY_ROUTE);
    });
  }, [canAsk, changed, router]);
}
