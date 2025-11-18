import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme } from '@/theme/ThemeProvider';

interface ThemeState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorScheme: 'system',
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
    }),
    {
      name: '@kalon:theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

