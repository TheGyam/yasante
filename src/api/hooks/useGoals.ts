import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Goal } from '@/types/planner';

const GOALS_QUERY_KEY = 'goals';

export function useGoals(userId: string = 'user-1') {
  return useQuery({
    queryKey: [GOALS_QUERY_KEY, userId],
    queryFn: async () => {
      const response = await api.goals.getAll(userId);
      return response.data;
    },
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

export function useCreateGoal(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.goals.create(goal);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateGoal(goalId: string, userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Goal>) => {
      const response = await api.goals.update(goalId, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY, goalId] });
    },
  });
}

export function useDeleteGoal(userId: string = 'user-1') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      await api.goals.delete(goalId);
      return goalId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY, userId] });
    },
  });
}

