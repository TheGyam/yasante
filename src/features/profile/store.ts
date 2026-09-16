import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, HairProfile } from '@/features/profile';

interface UserState {
  currentUserId: string;
  setCurrentUserId: (userId: string) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  hasSeenPlannerTour: boolean;
  setHasSeenPlannerTour: (seen: boolean) => void;
  /**
   * The hair profile as answered on this device. The onboarding quiz runs before
   * signup, so it has to live somewhere local or the answers are lost.
   */
  hairProfile: HairProfile | null;
  setHairProfile: (profile: HairProfile) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    set => ({
      currentUserId: '', // No default - will be set from auth context
      setCurrentUserId: userId => set({ currentUserId: userId }),
      onboardingCompleted: false,
      setOnboardingCompleted: completed => set({ onboardingCompleted: completed }),
      hasSeenPlannerTour: false,
      setHasSeenPlannerTour: seen => set({ hasSeenPlannerTour: seen }),
      hairProfile: null,
      setHairProfile: profile => set({ hairProfile: profile }),
    }),
    {
      name: '@yasante:user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
