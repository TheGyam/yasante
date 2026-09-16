import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, Activity } from '@/features/planner';

interface PlannerState {
  selectedGoalId: string | null;
  setSelectedGoalId: (goalId: string | null) => void;
  draftGoal: Partial<Goal> | null;
  setDraftGoal: (goal: Partial<Goal> | null) => void;
  draftActivity: Partial<Activity> | null;
  setDraftActivity: (activity: Partial<Activity> | null) => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    set => ({
      selectedGoalId: null,
      setSelectedGoalId: goalId => set({ selectedGoalId: goalId }),
      draftGoal: null,
      setDraftGoal: goal => set({ draftGoal: goal }),
      draftActivity: null,
      setDraftActivity: activity => set({ draftActivity: activity }),
    }),
    {
      name: '@yasante:planner',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
