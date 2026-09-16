import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentTopic, ContentType } from '@/features/education';

interface EducationState {
  selectedFilters: {
    hairType?: string;
    topic?: ContentTopic;
    type?: ContentType;
  };
  setFilters: (filters: EducationState['selectedFilters']) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useEducationStore = create<EducationState>()(
  persist(
    set => ({
      selectedFilters: {},
      setFilters: filters => set({ selectedFilters: filters }),
      searchQuery: '',
      setSearchQuery: query => set({ searchQuery: query }),
    }),
    {
      name: '@yasante:education',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
