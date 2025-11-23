import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../index';
import { Goal } from '@/types/planner';
import { useAuth } from '@/contexts/AuthContext';

const GOALS_QUERY_KEY = 'goals';

export function useGoals(userId?: string, options?: { enabled?: boolean }) {
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useQuery({
    queryKey: [GOALS_QUERY_KEY, actualUserId],
    queryFn: async () => {
      if (!actualUserId) {
        throw new Error('User ID is required');
      }
      const response = await api.goals.getAll(actualUserId);
      return response.data;
    },
    enabled: (options?.enabled !== false) && !!actualUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useGoal(goalId: string) {
  return useQuery({
    queryKey: [GOALS_QUERY_KEY, goalId],
    queryFn: async () => {
      const response = await api.goals.getById(goalId);
      return response.data;
    },
    enabled: !!goalId,
  });
}

export function useCreateGoal(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.goals.create(goal);
      return response.data;
    },
    onSuccess: (newGoal) => {
      if (actualUserId) {
        // Add new goal to list cache
        queryClient.setQueryData<Goal[]>(
          [GOALS_QUERY_KEY, actualUserId],
          (old = []) => [...old, newGoal]
        );
        // Set detail cache
        queryClient.setQueryData([GOALS_QUERY_KEY, newGoal.id], newGoal);
      }
    },
  });
}

export function useUpdateGoal(goalId: string, userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (updates: Partial<Goal>) => {
      const response = await api.goals.update(goalId, updates);
      return response.data;
    },
    onSuccess: (updatedGoal) => {
      if (actualUserId) {
        // Update list cache
        queryClient.setQueryData<Goal[]>(
          [GOALS_QUERY_KEY, actualUserId],
          (old = []) => old.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal)
        );
        // Update detail cache
        queryClient.setQueryData([GOALS_QUERY_KEY, goalId], updatedGoal);
      }
    },
  });
}

export function useDeleteGoal(userId?: string) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const actualUserId = userId || authUser?.id;

  return useMutation({
    mutationFn: async (goalId: string) => {
      await api.goals.delete(goalId);
      return goalId;
    },
    onSuccess: (goalId) => {
      if (actualUserId) {
        // Remove from list cache
        queryClient.setQueryData<Goal[]>(
          [GOALS_QUERY_KEY, actualUserId],
          (old = []) => old.filter(goal => goal.id !== goalId)
        );
        // Remove detail cache
        queryClient.removeQueries({ queryKey: [GOALS_QUERY_KEY, goalId] });
      }
    },
  });
}

