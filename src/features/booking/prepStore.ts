import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrepState {
  /** Prep ticked off, by booking. Hers alone, so it lives on her phone. */
  done: Record<string, string[]>;
  toggle: (bookingId: string, itemId: string) => void;
}

export const usePrepStore = create<PrepState>()(
  persist(
    set => ({
      done: {},
      toggle: (bookingId, itemId) =>
        set(state => {
          const current = state.done[bookingId] ?? [];
          return {
            done: {
              ...state.done,
              [bookingId]: current.includes(itemId)
                ? current.filter(id => id !== itemId)
                : [...current, itemId],
            },
          };
        }),
    }),
    { name: '@yasante:prep', storage: createJSONStorage(() => AsyncStorage) }
  )
);
