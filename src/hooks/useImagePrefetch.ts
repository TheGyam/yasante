import { useEffect, useRef } from 'react';
import { prefetch } from 'expo-image';

interface UseImagePrefetchOptions {
  enabled?: boolean;
  prefetchCount?: number; // Number of images to prefetch ahead
}

/**
 * Hook to prefetch images for items about to be visible
 * Uses expo-image prefetch API for efficient image caching
 */
export function useImagePrefetch(
  imageUris: string[],
  currentIndex: number,
  options: UseImagePrefetchOptions = {}
) {
  const { enabled = true, prefetchCount = 5 } = options;
  const prefetchedRef = useRef<Set<string>>(new Set());
  const cancelRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    if (!enabled || !imageUris || imageUris.length === 0) return;

    // Prefetch images for upcoming items
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(startIndex + prefetchCount, imageUris.length);

    for (let i = startIndex; i < endIndex; i++) {
      const uri = imageUris[i];
      if (!uri || prefetchedRef.current.has(uri)) continue;

      // Prefetch image
      const cancel = prefetch(uri, {
        priority: 'normal',
      });

      prefetchedRef.current.add(uri);
      cancelRef.current.set(uri, cancel);

      if (__DEV__) {
        console.log(`Prefetching image ${i + 1}/${imageUris.length}: ${uri.substring(0, 50)}...`);
      }
    }

    // Cancel prefetch for images that are far behind
    const cancelStartIndex = Math.max(0, currentIndex - prefetchCount * 2);
    for (let i = 0; i < cancelStartIndex; i++) {
      const uri = imageUris[i];
      if (uri && cancelRef.current.has(uri)) {
        const cancel = cancelRef.current.get(uri);
        if (cancel) {
          cancel();
          cancelRef.current.delete(uri);
        }
      }
    }

    return () => {
      // Cleanup: cancel all pending prefetches
      cancelRef.current.forEach((cancel) => {
        try {
          cancel();
        } catch (error) {
          // Ignore errors during cleanup
        }
      });
      cancelRef.current.clear();
    };
  }, [imageUris, currentIndex, enabled, prefetchCount]);

  return {
    prefetchedCount: prefetchedRef.current.size,
  };
}










