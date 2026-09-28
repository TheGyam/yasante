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
