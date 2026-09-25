import { useEffect, useRef } from 'react';

/**
 * Calls `onVisible` when the element comes within `margin` of the screen, for as long
 * as `enabled`. Used to load the next page before the reader reaches the end.
 */
export function useOnVisible<T extends Element>(
  onVisible: () => void,
  enabled: boolean,
  margin = '800px'
) {
  const ref = useRef<T>(null);
  const latest = useRef(onVisible);
  useEffect(() => {
    latest.current = onVisible;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) latest.current();
      },
      { rootMargin: margin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, margin]);

  return ref;
}
