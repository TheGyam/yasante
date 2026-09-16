import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme } from '@/shared/legacy/theme/ThemeProvider';

interface ThemeState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      colorScheme: 'system',
      setColorScheme: scheme => set({ colorScheme: scheme }),
    }),
    {
      name: '@yasante:theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
