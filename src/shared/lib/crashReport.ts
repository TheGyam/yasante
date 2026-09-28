import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from '@/shared/config/api';

/**
 * Tells the server something went wrong on this phone: a crash, or a start-up that
 * stalled. Sent straight with fetch, not through the API client, which waits on
 * sign-in — and a stuck sign-in may be the very thing being reported. Never throws.
 */
export function reportError(
  error: unknown,
  { kind = 'crash', context }: { kind?: 'crash' | 'stall'; context?: Record<string, unknown> } = {}
) {
  if (__DEV__) return;
  const e = error instanceof Error ? error : new Error(String(error));
  fetch(getApiUrl('/api/client-errors/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      message: e.message.slice(0, 2000) || 'No message',
      stack: (e.stack ?? '').slice(0, 20000),
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: Constants.expoConfig?.version ?? '',
      context,
    }),
  }).catch(() => {});
}

type Handler = (error: unknown, isFatal?: boolean) => void;
const errorUtils = (
  globalThis as unknown as {
    ErrorUtils?: { getGlobalHandler: () => Handler; setGlobalHandler: (h: Handler) => void };
  }
).ErrorUtils;

/** Every uncaught error is reported before React Native handles it as usual. */
export function startCrashReports() {
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { context: { fatal: !!isFatal } });
    previous(error, isFatal);
  });
}
