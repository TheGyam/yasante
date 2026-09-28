/**
 * Start-up checkpoints: how far the app gets as it opens, sent to the server so a
 * phone nobody here can plug in still shows where it stops (read at
 * GET /api/client-errors/). Loaded first of all, from index.ts. Plain fetch, no app
 * code, so it works even if everything after it doesn't. Only the first 20 seconds
 * of a launch are reported.
 */
import { Platform } from 'react-native';

const started = Date.now();
const launch = Math.random().toString(36).slice(2, 8);
const base = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.yasante.com').replace(/\/$/, '');

export function checkpoint(name: string) {
  if (__DEV__ || process.env.EXPO_PUBLIC_API_MOCKS === 'true') return;
  const ms = Date.now() - started;
  if (ms > 20_000) return;
  try {
    fetch(`${base}/api/client-errors/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'boot',
        message: name,
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        appVersion: 'boot-1',
        context: { launch, ms },
      }),
    }).catch(() => {});
  } catch {
    // Nothing to do: this is only a signal.
  }
}

checkpoint('js started');

// Whether Expo's native modules were set up on this runtime, and which: the app's
// code can't load without them.
try {
  const expo = (globalThis as unknown as { expo?: { modules?: Record<string, unknown> } }).expo;
  const names = expo?.modules ? Object.keys(expo.modules) : [];
  checkpoint(expo ? `expo modules (${names.length}): ${names.join(',')}`.slice(0, 480) : 'no expo runtime');
} catch (e) {
  checkpoint(`expo modules unreadable: ${String(e)}`.slice(0, 200));
}

// An error while the app's code loads happens before any other reporter exists, and
// in a release build it stops the app silently on the splash. Say what it was.
type Handler = (error: unknown, isFatal?: boolean) => void;
const errorUtils = (
  globalThis as unknown as {
    ErrorUtils?: { getGlobalHandler: () => Handler; setGlobalHandler: (h: Handler) => void };
  }
).ErrorUtils;
if (errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    const e = error instanceof Error ? error : new Error(String(error));
    const where = (e.stack ?? '').split(String.fromCharCode(10)).slice(0, 6).join(' | ');
    checkpoint(`${isFatal ? 'FATAL' : 'error'}: ${e.message} @ ${where}`.slice(0, 480));
    previous(error, isFatal);
  });
}
