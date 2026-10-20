import { create } from 'zustand';

interface LookFilterState {
  hairLikeMine: boolean;
  style?: string;
  area?: string;
  setHairLikeMine: (on: boolean) => void;
  setStyle: (style?: string) => void;
  setArea: (area?: string) => void;
  clear: () => void;
}

/**
 * What the feed is narrowed to. Shared with the area picker, and kept for the
 * session rather than across launches — a filter left on from last week reads as
 * an empty feed.
 */
export const useLookFilters = create<LookFilterState>(set => ({
  hairLikeMine: false,
  setHairLikeMine: hairLikeMine => set({ hairLikeMine }),
  setStyle: style => set({ style }),
  setArea: area => set({ area }),
  clear: () => set({ hairLikeMine: false, style: undefined, area: undefined }),
}));

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
