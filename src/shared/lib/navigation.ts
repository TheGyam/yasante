import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- this module is that wrapper
import { useRouter as useExpoRouter, type Router } from 'expo-router';

/**
 * The app's router. Identical to Expo Router's, except it ignores a second
 * navigation that arrives within a few hundred milliseconds of the first.
 *
 * A tap that pushes a screen is easy to fire twice — an impatient double tap, or a
 * fat-finger press on two rows at once — and every one of those would open a second
 * copy. One intent, one navigation.
 *
 * Import this instead of Expo Router's `useRouter` (ESLint enforces it).
 */
const GAP_MS = 400;

let lastAt = 0;

/** Lets the first call through, then blocks anything for GAP_MS. */
function once() {
  const now = Date.now();
  if (now - lastAt < GAP_MS) return false;
  lastAt = now;
  return true;
}

/** Escape hatch for navigating twice on purpose, e.g. closing a modal then opening a screen. */
export function withoutThrottle<T>(run: () => T): T {
  lastAt = 0;
  const result = run();
  lastAt = 0;
  return result;
}

/**
 * Where a guest goes instead, if this destination needs an account. Registered by
 * the auth feature at load, so shared/ doesn't depend on it.
 */
let accountGate: (href: unknown) => string | undefined = () => undefined;
export const setAccountGate = (gate: typeof accountGate) => {
  accountGate = gate;
};
const gated = <H>(href: H) => (accountGate(href) ?? href) as H;

export function useRouter(): Router {
  const router = useExpoRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href, options) => {
        if (once()) router.push(gated(href), options);
      },
      navigate: (href, options) => {
        if (once()) router.navigate(gated(href), options);
      },
      replace: (href, options) => {
        if (once()) router.replace(gated(href), options);
      },
      back: () => {
        if (once()) router.back();
      },
      dismiss: (...args: Parameters<Router['dismiss']>) => {
        if (once()) router.dismiss(...args);
      },
      dismissAll: () => {
        if (once()) router.dismissAll();
      },
      dismissTo: (...args: Parameters<Router['dismissTo']>) => {
        if (once()) router.dismissTo(...args);
      },
    }),
    [router]
  );
}
