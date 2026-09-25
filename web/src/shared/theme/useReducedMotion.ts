import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const list = window.matchMedia?.(QUERY);
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

/** True when the person has asked for less motion. CSS handles most of it; this is for script. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false
  );
}
