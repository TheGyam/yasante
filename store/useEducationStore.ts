import { create } from 'zustand';
import { Content } from '@/types/education';

interface EducationState {
  favorites: string[]; // Content IDs
  recentlyViewed: string[]; // Content IDs
  addFavorite: (contentId: string) => void;
  removeFavorite: (contentId: string) => void;
  addRecentlyViewed: (contentId: string) => void;
  isFavorite: (contentId: string) => boolean;
}

export const useEducationStore = create<EducationState>()((set, get) => ({
  favorites: [],
  recentlyViewed: [],
  addFavorite: (contentId) =>
    set((state) => ({
      favorites: state.favorites.includes(contentId)
        ? state.favorites
        : [...state.favorites, contentId],
    })),
  removeFavorite: (contentId) =>
    set((state) => ({
      favorites: state.favorites.filter((id) => id !== contentId),
    })),
  addRecentlyViewed: (contentId) =>
    set((state) => {
      const filtered = state.recentlyViewed.filter((id) => id !== contentId);
      return {
        recentlyViewed: [contentId, ...filtered].slice(0, 20), // Keep last 20
      };
    }),
  isFavorite: (contentId) => get().favorites.includes(contentId),
}));

