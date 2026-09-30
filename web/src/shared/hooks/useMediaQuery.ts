import { useSyncExternalStore } from 'react';

/** Whether a media query matches now, kept current as the window changes. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    listener => {
      if (!window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', listener);
      return () => list.removeEventListener('change', listener);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false
  );
}
