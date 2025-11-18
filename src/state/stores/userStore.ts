import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, HairProfile } from '@/types/user';

interface UserState {
  currentUserId: string;
  setCurrentUserId: (userId: string) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  hasSeenPlannerTour: boolean;
  setHasSeenPlannerTour: (seen: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUserId: 'user-1',
      setCurrentUserId: (userId) => set({ currentUserId: userId }),
      onboardingCompleted: false,
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      hasSeenPlannerTour: false,
      setHasSeenPlannerTour: (seen) => set({ hasSeenPlannerTour: seen }),
    }),
    {
      name: '@kalon:user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

