import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LookFilterState {
  hairLikeMine: boolean;
  style?: string;
  area?: string;
  /** Newest first, nothing personal, instead of the feed picked for her. */
  latest: boolean;
  setHairLikeMine: (on: boolean) => void;
  setStyle: (style?: string) => void;
  setArea: (area?: string) => void;
  setLatest: (on: boolean) => void;
  clear: () => void;
}

/**
 * What the feed is narrowed to. Shared with the area picker, and kept for the
 * session rather than across launches — a filter left on from last week reads as
 * an empty feed. "Latest" is a way of seeing the feed rather than a filter, so the
 * phone remembers it.
 */
export const useLookFilters = create<LookFilterState>()(
  persist(
    set => ({
      hairLikeMine: false,
      latest: false,
      setHairLikeMine: hairLikeMine => set({ hairLikeMine }),
      setStyle: style => set({ style }),
      setArea: area => set({ area }),
      setLatest: latest => set({ latest }),
      clear: () => set({ hairLikeMine: false, style: undefined, area: undefined }),
    }),
    {
      name: '@yasante:feed-order',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ latest: state.latest }),
    }
  )
);

/**
 * The styles her recent searches were for, newest first, at most three: "knotless" or
 * "box braids" name a style; a word as broad as "braids" doesn't pick them all.
 */
export function searchedStyles(
  queries: string[],
  styles: { id: string; name: string }[],
  max = 3
): string[] {
  const found: string[] = [];
  for (const query of queries) {
    const words = query.trim().toLowerCase();
    if (words.length < 4) continue;
    for (const style of styles) {
      const name = style.name.toLowerCase();
      if ((words.includes(name) || name.startsWith(words)) && !found.includes(style.id)) {
        found.push(style.id);
      }
    }
    if (found.length >= max) break;
  }
  return found.slice(0, max);
}
