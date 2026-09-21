import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { apiClient } from '@/shared/lib/api/client';
import { useConsentStore } from './consentStore';

/** An attempt that hasn't settled by then is given up on; the records stay pending. */
const GIVE_UP_MS = 20_000;

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

  // A request stuck behind a token refresh mustn't hold every later sync hostage.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const giveUp = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out')), GIVE_UP_MS);
  });

  inFlight = Promise.race([send, giveUp])
    // Stays pending; the next change, launch or return to the app tries again.
    .catch(error => {
      if (__DEV__) console.warn('[consents] not synced yet:', error?.message ?? error);
    })
    .finally(() => {
      clearTimeout(timer);
      inFlight = null;
    });
  return inFlight;
}

/** While signed in: sync now, whenever a choice changes, and when the app comes back. */
export function useConsentSync(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    void syncConsents();
    const unsubscribe = useConsentStore.subscribe((state, previous) => {
      if (state.consents !== previous.consents) void syncConsents();
    });
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') void syncConsents();
    });
    return () => {
      unsubscribe();
      foreground.remove();
    };
  }, [signedIn]);
}
