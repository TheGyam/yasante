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
