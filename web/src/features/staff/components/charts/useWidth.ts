import { useLayoutEffect, useRef, useState } from 'react';

/** The element's width, kept current: charts draw at real pixels, so text never stretches. */
export function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    setWidth(node.clientWidth || fallback);
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width) || fallback)
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}
