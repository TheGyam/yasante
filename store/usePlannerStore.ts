import { create } from 'zustand';
import { Goal, ProgressEntry, Routine, ActivityLog } from '@/types/planner';

interface PlannerState {
  goals: Goal[];
  progressEntries: ProgressEntry[];
  routines: Routine[];
  activityLogs: ActivityLog[];
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addProgressEntry: (entry: ProgressEntry) => void;
  deleteProgressEntry: (id: string) => void;
  addRoutine: (routine: Routine) => void;
  updateRoutine: (id: string, updates: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  addActivityLog: (log: ActivityLog) => void;
  deleteActivityLog: (id: string) => void;
}

export const usePlannerStore = create<PlannerState>()((set) => ({
  goals: [],
  progressEntries: [],
  routines: [],
  activityLogs: [],
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g
      ),
    })),
  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
      progressEntries: state.progressEntries.filter((e) => e.goalId !== id),
    })),
  addProgressEntry: (entry) =>
    set((state) => ({ progressEntries: [...state.progressEntries, entry] })),
  deleteProgressEntry: (id) =>
    set((state) => ({
      progressEntries: state.progressEntries.filter((e) => e.id !== id),
    })),
  addRoutine: (routine) =>
    set((state) => ({ routines: [...state.routines, routine] })),
  updateRoutine: (id, updates) =>
    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    })),
  deleteRoutine: (id) =>
    set((state) => ({ routines: state.routines.filter((r) => r.id !== id) })),
  addActivityLog: (log) =>
    set((state) => ({ activityLogs: [...state.activityLogs, log] })),
  deleteActivityLog: (id) =>
    set((state) => ({ activityLogs: state.activityLogs.filter((l) => l.id !== id) })),
}));

